CSCI 356 Fall 2024 Project 3 Starter Code
-----------------------------------------

This repository contains starter code for project 3, in which you will implement
the whisper web app. 

* `web_files` - The files implmenting the client half of the whisper app.

Tasks:

- [x] implement the client half of the whisper app
- [ ] add webserver.py for the server half, borrowing from earlier project
   - [ ] print the appropriate URL for whisper app to console
- [ ] handle GET for topic list
   - [ ] handle version 0 as a temporary stop-gap
   - [ ] handle version 1 as a temporary stop-gap
   - [ ] handle any version N, the general case, with proper wait/notify\_all
   - [ ] return appropriate errors if topic not found or other errors
- [ ] handle POST for messages
   - [ ] return appropriate errors if request is malformed or other errors
- [ ] handle GET for topic message feed
   - [ ] handle any version N, with proper wait/notify\_all
   - [ ] return appropriate errors if topic is not found or other errors
- [ ] handle POST for liking a topic
   - [ ] return appropriate errors if topic is not found or other errors
- [ ] reach goal: topics are sorted by some criteria
- [ ] reach goal: limit each topic to only the most recent messages
- [ ] reach goal: implement downvoting/removal of messages
- [ ] reach goal: implement other features, e.g. using cookies, etc.
- [ ] project still does not use HTTP related python libraries or modules
- [ ] does not crash under normal usage
- [ ] Update README.md to describe final state of project, collaboration, etc.
