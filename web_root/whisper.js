
if (document.readyState == 'complete') {
    initialize_app();
} else {
    document.onreadystatechange = function() {
      if (document.readyState === 'complete')
        initialize_app();
    };
}

function initialize_app() {
    var userinput = document.getElementById("userinput");
    var sendbutton = document.getElementById("sendbutton");
    var suggest = document.getElementById("suggest");
    userinput.addEventListener("keyup",
        function(event) {
            if (event.key === "Enter")
                send_tweet();
            return false;
        });
    userinput.addEventListener("input",
        function(event) {
            sendbutton.disabled = (this.value === '');
        });
    suggest.addEventListener('change',
        function(event) {
            if (event.currentTarget.checked) {
                make_suggestion();
                sendbutton.disabled = false;
            } else {
                clear_suggestion();
                sendbutton.disabled = true;
            }
    });
    join_topic(null);
    update_topics_list();
}

var topic_list_version = -1;
var topic_list_count = 0;

var selected_topic = null;
var topic_version = -1;
var feed_request = null;

function update_topics_list() {
    console.log("update topic list");
    // Get list of topics from server by making an HTTP request for /whisper/topics
    var req = new XMLHttpRequest();
    try {
        req.open("GET", "/whisper/topics?version="+(topic_list_version+1));
        console.log("sending HTTP GET for topics list");
        req.send();
    } catch (error) {
        console.log(error);
        clear_topics_list("", "Can't connect... see javascript console for details.");
        topic_list_version = -1;
        setTimeout(update_topics_list, 5000);
        return;
    }
    req.onerror = () => {
        clear_topics_list("", "HTTP GET for topics list seems to have failed...");
        topic_list_version = -1;
        setTimeout(update_topics_list, 5000);
    };
    req.onload = (event) => {
        // The HTTP request is done
        console.log("finished HTTP GET for topics list");
        if (req.status != 200) {
            clear_topics_list("", "HTTP GET for topics list finished, but with status " + req.status);
            setTimeout(update_topics_list, 5000);
            return;
        }

        // The response should be a version number on one line,
        // then a list of (count, likes, topics) one per line
        var lines, newVersion, topics;
        try {
            lines = req.response.trim().split("\n");
            newVersion = toInteger(lines[0]);
            topics = lines.slice(1);
        } catch (error) {
            console.log(error);
            clear_topics_list("", "Can't parse server response, see javascript console for details.");
            topic_list_version = -1;
            setTimeout(update_topics_list, 5000);
            return;
        }

        if (newVersion <= topic_list_version) {
            alert("Oops, we asked for newer than version "+topic_list_version+" of topics list, but server gave us version " + newVersion);
            alert("Attempting to resync by accepting topics list version " + newVersion);
            topic_list_version = newVersion;
            setTimeout(update_topics_list, 5000);
            return;
        }

        topic_list_version = newVersion;
     
        // Populate the HTML list with the topics
        var boxes = document.getElementById("topicslist");
        var statline = document.getElementById("topic_statusline");
        var errline = document.getElementById("topic_errorline");
        try {
            clear_topics_list("Updating topics list...", "");
            topic_list_count = topics.length;
            if (topic_list_count == 0)
                statline.innerHTML = "No topics have been mentioned yet :(";
            else if (topic_list_count == 1)
                statline.innerHTML = "There is only one topic available :(";
            else
                statline.innerHTML = "There are " + topic_list_count + " topics available!";
            statline.innerHTML += "<br>(Topics list version: " + topic_list_version +")";

            var found_topic = false;
            for (var i = 0; i < topics.length; i++) {
                var line = topics[i].trim();
                var parts = line.split(" ");
                var count, likes, tag;
                if (parts.length == 3) {
                    count = parts[0];
                    likes = parts[1];
                    tag = parts[2];
                } else {
                    count = "?";
                    likes = "?";
                    tag = line;
                    errline.innerHTML = "Error parsing server response.";
                }
                var button = document.createElement("div");
                button.classList.add("topic_button");
                button.id = "topic_" + tag;
                var likestr;
                if (likes == "0")
                    likestr = "";
                else if (likes == "1")
                    likestr = " &#x1F44D;";
                else
                    likestr = " &#x1F44D;&times;" + likes;
                var countstr;
                if (count == "0")
                    countstr = "";
                else 
                    countstr = count + "&times; ";
                button.innerHTML = countstr + "<b>#" + escapeHtml(tag) + "</b>" + likestr;
                button.onclick = ((name) => () => join_topic(name))(tag);
                if (tag == selected_topic) {
                    button.classList.add("selected_topic");
                    found_topic = true;
                }
                boxes.insertBefore(button, statline);
            }
            if (selected_topic != null && !found_topic) {
                join_topic(null);
            }
            setTimeout(update_topics_list, 0);
        } catch (error) {
            console.log(error);
            errline.innerHTML = "Can't parse server response, see javascript console for details.";
            setTimeout(update_topics_list, 5000);
        }
    };
}

function clear_topics_list(statmsg, errmsg) {
    console.log("clearing topics list");
    // Clear the HTML list of all topic buttons
    var buttons = document.getElementsByClassName("topic_button");
    while (buttons.length > 0) {
        var b = buttons[0];
        b.parentNode.removeChild(b);
    }
    var statline = document.getElementById("topic_statusline");
    var errline = document.getElementById("topic_errorline");
    statline.innerHTML = statmsg;
    errline.innerHTML = errmsg;
}

function extractTags(msg) {
    var tags = msg.split(/[\s,\?]+/) // split message on whitespace, commas, and question marks
        .filter(word => word.startsWith('#')) // keep only the hashtag words
        .map(word => word.slice(1)) // discard the leading "#"
        .filter(Boolean); // discard any empty strings
    return [...new Set(tags)]; // remove duplicates
}

function send_tweet() {
    var m = document.getElementById("userinput");
    var msg = m.value;
    m.value = "";
    var tags = extractTags(msg);
    console.log("send message '" + msg +"' with " + tags.length + " tags: " + tags.join(" "));
    // Send new tweet to server by making an HTTP POST to /whisper
    var req = new XMLHttpRequest();
    try {
        console.log("sending HTTP POST to whisper");
        req.open("POST", "/whisper/messages");
        req.setRequestHeader("Content-type", "text/plain");
        req.send("tags... " + tags.join(" ") +"\n" +
            "message... " + msg + "\n");
    } catch (error) {
        console.log(error);
        alert("Can't connect... see javascript console for details.");
        return;
    }
    req.onerror = () => { alert("HTTP POST to whisper seems to have failed..."); };
    req.onload = (event) => {
        // The HTTP request is done
        console.log("finished HTTP POST to whisper");
        if (req.status != 200) {
            alert("HTTP POST to whisper finished, but with status " + req.status);
            return;
        }
        // Response should be "success" or an error message
        var resp = req.response.trim();
        if (resp != "success") {
            alert("Sorry, server says: " + resp);
            return;
        }
        if (document.getElementById("suggest").checked)
            make_suggestion();
    };
    return false;
}

function like_topic() {
    console.log("like topic");
    // Perform HTTP POST to notify server we like this topic
    var req = new XMLHttpRequest();
    try {
        req.open("POST", "/whisper/like/" + encodeURIComponent(selected_topic));
        req.send();
    } catch (error) {
        console.log(error);
        alert("Can't connect... see javascript console for details.");
        return;
    }
    req.onerror = () => { alert("Sorry, something went wrong liking this topic."); }
    req.onload = (event) => {
        // The HTTP request is done
        console.log("finished HTTP POST for like");
        if (req.status != 200) {
            alert("HTTP POST for like finished, but with status " + req.status);
            return;
        }

        // Response should be "success" or an error message
        var resp = req.response.trim();
        if (resp != "success") {
            alert("Sorry, server says: " + resp);
            return;
        }
    };

    return false;
}

function downvote_message(msgid) {
    console.log("downvote message with id " + msgid);
    // Perform HTTP POST to notify server we are downvoting this message
    var req = new XMLHttpRequest();
    try {
        req.open("POST", "/whisper/downvote/" + encodeURIComponent(msgid));
        req.send();
    } catch (error) {
        console.log(error);
        alert("Can't connect... see javascript console for details.");
        return;
    }
    req.onerror = () => { alert("Sorry, something went wrong downvoting this message."); }
    req.onload = (event) => {
        // The HTTP request is done
        console.log("finished HTTP POST for downvote");
        if (req.status != 200) {
            alert("HTTP POST for downvote finished, but with status " + req.status);
            return;
        }

        // Response should be "success" or an error message
        var resp = req.response.trim();
        if (resp != "success") {
            alert("Sorry, server says: " + resp);
            return;
        }
    };

    return false;
}

function join_topic(name) {
    console.log("join topic: '" + name + "'");
    var buttons = document.getElementsByClassName("topic_button");
    for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        if (button.id == "topic_" + name)
            button.classList.add("selected_topic");
        else
            button.classList.remove("selected_topic");
    }
    topic_version = -1;
    selected_topic = name;
    var like = document.getElementById("likebutton");
    like.disabled = (name == null);
    like.hidden = (name == null);
    like.value = "Like topic #" + selected_topic;
    update_message_list();
}

function clear_feed(statmsg, errmsg) {
    console.log("clearing message list");
    // Clear the HTML list of all feed message boxes
    var msgs = document.getElementsByClassName("feed_message");
    while (msgs.length > 0) {
        var m = msgs[0];
        m.parentNode.removeChild(m);
    }
    var statline = document.getElementById("feed_statusline");
    var errline = document.getElementById("feed_errorline");
    statline.innerHTML = statmsg;
    errline.innerHTML = errmsg;
}

function update_message_list() {
    // cancel any outstanding requests
    if (feed_request != null) {
        feed_request.abort();
        feed_request = null;
    }
    console.log("update message list for topic '" + selected_topic + "'");
    if (selected_topic == null) {
        clear_feed("No posts to show... try picking a different topic?", "");
        return;
    }
    
    // Get feed contents from server by making an HTTP request for /whisper/feed/TOPIC
    var req = new XMLHttpRequest();
    try {
        req.open("GET", "/whisper/feed/"+encodeURIComponent(selected_topic)+"?version="+(topic_version+1));
        console.log("sending HTTP GET for topic feed contents");
        req.send();
    } catch (error) {
        console.log(error);
        clear_feed("", "Can't connect... see javascript console for details.");
        topic_version = -1;
        setTimeout(update_message_list, 5000);
        return;
    }
    feed_request = req;
    req.onerror = () => {
        clear_feed("", "HTTP GET for topic feed contents seems to have failed...");
        topic_version = -1;
        setTimeout(update_message_list, 5000);
    };
    var boxes = document.getElementById("messagelist");
    var statline = document.getElementById("feed_statusline");
    req.onload = (event) => {
        // The HTTP request is done
        console.log("finished HTTP GET for topic feed contents");
        if (req.status != 200) {
            clear_feed("", "HTTP GET for topic feed finished, but with status " + req.status);
            setTimeout(update_message_list, 5000);
            return;
        }

        // The response should be a version number on one line, then all the
        // matching messages, one per line
        var lines, newVersion, msgs;
        try {
            lines = req.response.slice(i+1).split("\n").filter(Boolean);
            newVersion = toInteger(lines[0]);
            msgs = lines.slice(1).filter(function(entry) { return entry.trim() != ''; });
        } catch (error) {
            console.log(error);
            clear_feed("", "Can't parse server response.");
            topic_version = -1;
            setTimeout(update_message_list, 5000);
            return;
        }
        if (newVersion <= topic_version) {
            alert("Oops, we asked for newer than version "+topic_version+" of feed list, but server gave us version " + newVersion);
            alert("Attempting to resync by accepting message list version " + newVersion);
            topic_version = newVersion;
            setTimeout(update_message_list, 5000);
            return;
        }
        topic_version = newVersion;
        clear_feed("There are " + msgs.length + " messages in topic #" + selected_topic +
            "<br>(Message list version: " + topic_version +")", "");
        var found_topic = false;
        for (var i = 0; i < msgs.length; i++) {
            var line = msgs[i].trim();
            var msgid, msg, downvote;
            var idx = line.indexOf(' ');
            if (idx >= 0) {
                msgid = line.substr(0,idx);
                msg = line.substr(idx+1);
                if (msgid == '-')
                    downvote = ''; // hide downvote button
                else
                    downvote = '<div class="downvote_botton" onclick="downvote_message(\''+msgid+'\')">&times;</div>';
            } else {
                msgid = '-1';
                msg = line;
                downvote = '??? ';
            }
            var box = document.createElement("div");
            box.classList.add("feed_message");
            var pattern = new RegExp(`(\\s|\\?|^)#${escapeHtml(selected_topic)}(\\s|\\?|$)`, "g");
            box.innerHTML = downvote + escapeHtml(msg).replaceAll(pattern, "$1<b>#"+selected_topic+"</b>$2");
            boxes.insertBefore(box, statline);
        }
        setTimeout(update_message_list, 0);
    };
}

// https://stackoverflow.com/questions/6234773/can-i-escape-html-special-chars-in-javascript
function escapeHtml(unsafe)
{
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

// https://codepen.io/chiragbhansali/pen/EWppvy
let nouns = [
  "bubble", "unicorn", "penguin", "marshmallow", "zebra", "cupcake",
  "jellyfish", "rocket", "tulip", "waffle", "giraffe", "pickle",
  "squirrel", "kite", "rainbow", "pineapple", "dolphin", "cactus",
  "popsicle", "cloud", "tiger", "skateboard", "pillow", "octopus",
  "doughnut", "koala", "banana", "firefly", "sandcastle", "mushroom"
];
let verbs = [
  "wiggle", "juggle", "bounce", "flutter", "giggle", "twirl", "zoom", "splash",
  "squish", "skip", "doodle", "munch", "pounce", "whirl", "bop", "whistle",
  "sprint", "fizz", "hop", "jolt", "glide", "wiggle", "zoom", "snuggle",
  "flick", "tumble", "pop", "tickle", "skate", "zap"
];
let adjectives = [ "wobbly", "sparkly", "fuzzy", "bouncy", "fluffy", "squishy",
  "glittery", "zippy", "wacky", "sticky", "wiggly", "goofy", "chunky",
  "brilliant", "whimsical", "quirky", "snazzy", "spunky", "breezy", "fluffy",
  "jolly", "zany", "shiny", "crunchy", "puffy", "chirpy", "jumpy", "silly",
  "bright", "snappy"
];
let adverbs = [ "quickly", "happily", "wiggly", "playfully", "cheerfully",
  "lazily", "awkwardly", "clumsily", "gracefully", "boldly", "softly",
  "curiously", "brightly", "eagerly", "noisily", "smoothly", "jubilantly",
  "fiercely", "zippily", "gently", "gleefully", "jovially", "wildly", "bravely",
  "merrily", "bouncily", "sillily", "goofily", "hastily", "sneakily"
];
let prepositions = [ "above", "across", "against", "along", "among", "around",
  "before", "behind", "below", "beneath", "beside", "between", "beyond", "by",
  "during", "for", "from", "inside", "near", "off", "onto", "outside", "over",
  "through", "under", "until", "upon", "with", "within", "without"
];
let hashtags = [
  "#FluffyDreams",
  "#CakeTime",
  "#FizzBuzz",
  "#Foo",
  "#NearlyDone!",
  "#AmIDone?"
];
let patterns = [
    "Sure, a ADJ #NOUN is ADJ, but they VERB. TAG",
    "Why can't #ADJ #NOUN ADV VERB? TAG TAG",
    "Why is #NOUN PREP ADJ NOUN? TAG",
    "Got NOUN ? TAG TAG TAG",
    "PREP VERB, ADJ #ADJ amirite? TAG",
    "NOUN PREP NOUN. TAG TAG"
];

function pickFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function replaceAll(s, key, arr) {
    var oldstr = "";
    while (s != oldstr) {
        oldstr = s;
        s = s.replace(key, pickFrom(arr));
    }
    return s;
}

function make_suggestion() {
    var s = pickFrom(patterns);
    s = replaceAll(s, "NOUN", nouns);
    s = replaceAll(s, "VERB", verbs);
    s = replaceAll(s, "ADJ", adjectives);
    s = replaceAll(s, "ADV", adverbs);
    s = replaceAll(s, "PREP", prepositions);
    s = replaceAll(s, "TAG", hashtags);
    var m = document.getElementById("userinput");
    m.value = s;
    return false;
};

function clear_suggestion() {
    var m = document.getElementById("userinput");
    m.value = "";
    return false;
}

function toInteger(s) {
    x = Number(s);
    if (isNaN(x) || !Number.isSafeInteger(x))
        throw new Error("String '"+s+"' can't be converted to integer.");
    return x;
}

