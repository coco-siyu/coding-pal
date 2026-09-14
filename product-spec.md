# Pairroom product spec

## Audience and job

An interviewer needs to share a coding space with a candidate without asking either person to install an editor. Create a room, share its URL, edit code together, and run small examples in the browser.

## User stories and acceptance criteria

1. As an interviewer, I can create a room and copy its URL. A room has a stable, unguessable ID; an invalid room URL shows a useful error.
2. As a participant, I can edit a shared document. Two connected browsers receive code and language updates without reloading. Reopening a room restores its last saved state.
3. As a participant, I can select JavaScript or Python and read highlighted code. Switching language resets the starter code and syncs to everyone.
4. As a participant, I can run code in my browser and read output or an error. The backend never evaluates it. Python loads Pyodide on demand.
5. As a developer, I can start frontend and backend with one command and run automated integration tests.

## Non-goals for this homework

Authentication, video, chat, per-character merge/CRDT, package installation inside the runner, and server-side arbitrary code execution.
