# Drop

Drop is a web app for anonymous messages tied to real places. Anyone with a person's link can send them a short anonymous note, and can add an approximate location and a photo as clues. The person who receives it reads it in a private inbox and can share it as an image for their social media stories.

## How the system is put together

Drop runs as a single service on the internet.

- **The web app** is what people see in their browser: the page where senders write a drop, and the inbox where recipients read them.
- **The link** takes drops only while its owner has a statement running. A statement is a short line, such as a question for followers, that opens the link for two hours, and the owner can end it sooner.
- **The server** receives drops, checks them (for abuse, spam, and blocked senders), stores them, and hands the web app the data it asks for. It also delivers the web app itself, so both arrive from the same address.
- **The database** stores accounts, profiles, and drops. Only the server can reach it.
- **Deleting an account** is a step in Settings. It removes the person's profile and every drop sent to them, with its photos, and signs them out everywhere. Their link name stays locked for 30 days.
- **The legal pages** (Terms, Privacy and Safety) are open to everyone and say in plain words what Drop is, what it keeps, and where to get help. Drop is open to all ages.
- **File storage** keeps photos and map data.

## Where to read more

| Document                                                       | For                                                      |
| -------------------------------------------------------------- | -------------------------------------------------------- |
| The product requirements document, kept beside this repository | What Drop must do and the rules it must follow           |
| The technical reference, in the technical folder               | Developers: structure, settings, commands, and endpoints |
| The progress documents, in the progress folder                 | What has been built so far, module by module, and why    |
