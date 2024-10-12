Will Schimitsch - CSCI 356 Fall 2024 Project 3
-----------------------------------------

This repository contains the code for the whisper web app. The Python code supports all necessary
functions of the app, including displaying a topics list, using versioning, likes, etc. The code 
also implements reach goals, such as downvotes, sorting by popularity, and limiting the messages 
by recency. The code also allows for persistent sessions with the use of file manipulation: 
`topics.txt` stores the topics list from the last client session and the server reboots the topic
list using this file. 

* `web_files` - The files implmenting the client half of the whisper app.
* `webserver.py` - Python code for the whisper web app
* `topics.txt` - File to store the contents of the web app, persistent across sessions

Collaboration

I read python documentation to use things like file manipulation and the threading files. Otherwise, I worked on this 
project entirely alone and did not use any other outside resources. 