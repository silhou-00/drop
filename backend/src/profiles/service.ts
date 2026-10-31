// Profile business rules. Reads public and own profiles, creates the one profile an
// account may own, and updates its settings. Uniqueness is decided by the database. The
// public profile carries the running statement (text and time left only), or null when
// the link is closed; the own profile does not carry it.
import { AppError } from "../shared/errors.js";
import { toPublicStatement, type PublicStatement, type StatementView } from "../statements/model.js";
import {
    USERNAME_TAKEN_MESSAGE,
    usernameSchema,
    type CreateProfileInput,
    type Profile,
    type UpdateProfileInput,
} from "./model.js";
import type { ProfileRepository } from "./repository.js";

type ProfileBase = {
    username: string;
    displayName: string;
    avatarUrl: string | null;
};

export type PublicProfile = ProfileBase & {
    statement: PublicStatement | null;
};

type Dependencies = {
    findRunningStatement: (profileId: string) => Promise<StatementView | null>;
};

export type OwnProfile = ProfileBase & {
    heatmapEnabled: boolean;
    notifyEmail: boolean;
    createdAt: string;
};

function notFound() {
    return new AppError(404, "NOT_FOUND", "Not found");
}

function toBase(profile: Profile): ProfileBase {
    return {
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: null,
    };
}

function toOwn(profile: Profile): OwnProfile {
    return {
        ...toBase(profile),
        heatmapEnabled: profile.heatmapEnabled,
        notifyEmail: profile.notifyEmail,
        createdAt: profile.createdAt.toISOString(),
    };
}

export function createProfileService(repository: ProfileRepository, { findRunningStatement }: Dependencies) {
    // public read
    async function getPublicProfile(username: string): Promise<PublicProfile> {
        const parsed = usernameSchema.safeParse(username);

        if (!parsed.success) {
            throw notFound();
        }

        const profile = await repository.findByUsername(parsed.data);

        if (!profile) {
            throw notFound();
        }

        const statement = await findRunningStatement(profile.id);

        return { ...toBase(profile), statement: statement ? toPublicStatement(statement) : null };
    }

    // own read
    async function getOwnProfile(userId: string): Promise<OwnProfile> {
        const profile = await repository.findByUserId(userId);

        if (!profile) {
            throw notFound();
        }

        return toOwn(profile);
    }

    // create, with races settled by the unique constraints
    async function createProfile(userId: string, input: CreateProfileInput): Promise<OwnProfile> {
        const result = await repository.insertProfile({
            userId,
            username: input.username,
            displayName: input.displayName,
        });

        if ("conflict" in result) {
            if (result.conflict === "username") {
                throw new AppError(409, "USERNAME_TAKEN", USERNAME_TAKEN_MESSAGE);
            }

            throw new AppError(409, "PROFILE_EXISTS", "You already have a profile");
        }

        return toOwn(result.profile);
    }

    // settings update
    async function updateOwnProfile(userId: string, input: UpdateProfileInput): Promise<OwnProfile> {
        const profile = await repository.updateByUserId(userId, input);

        if (!profile) {
            throw notFound();
        }

        return toOwn(profile);
    }

    return { getPublicProfile, getOwnProfile, createProfile, updateOwnProfile };
}

export type ProfileService = ReturnType<typeof createProfileService>;
