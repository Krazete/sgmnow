var events = {
    "rift": {
        "row": 3,
        "range": "B4:B14,F4:M14", 
        "colors": ["#f97d9f", "#d96988", "#b95571", "#99415a", "gold", "#ecbe10", "goldenrod", "#c78c30"],
        "data": false
    },
    "char": {
        "row": 6,
        "range": "B15:B25,E15:F25,K15:L25",
        "colors": ["#f97d9f", "#b95571", "gold", "goldenrod"],
        "data": false
    },
    "elem": {
        "row": 9,
        "range": "B26:B36,E26:F36", 
        "colors": ["gold", "silver"],
        "data": false
    },
    "medi": {
        "row": 12,
        "range": "B37:B47,D37:D47", 
        "colors": ["#f97d9f"],
        "data": false
    },
    "smym": {
        "row": 15,
        "range": "B48:B58,E48:F58", 
        "colors": ["gold", "silver"],
        "data": false
    },
    "holi": {
        "row": 18,
        "range": "B59:B69,D59:H69", 
        "colors": ["#f97d9f", "gold", "silver"],
        "data": false
    }
};
var selectedEvent;
var now;
var lastCheck = 0;
var waitBuffer = 0;
var propagateUpdate = false;
var attempts = 10;

google.charts.load("current", {"packages": ["corechart"]});
google.charts.setOnLoadCallback(keepFresh);

function sendQuery(q, f, ids) {
    var elements = ids.map(id => document.getElementById(id));
    elements.forEach(e => {
        e.classList.remove("error");
        e.classList.add("loading");
    });

    var sheetID = "1hpmUc__uYo0-tq10tampy7CDIfALn6N5_sMELTBlTOs";
    var pageName = "now";
    var tqOrRange = encodeURIComponent(q);
    var url = [
        "https://docs.google.com/spreadsheets/d/",
        sheetID,
        "/gviz/tq?sheet=",
        pageName,
        "&",
        tqOrRange.toLowerCase().indexOf("select") < 0 ? "range" : "tq",
        "=",
        tqOrRange
    ].join("");

    var query = new google.visualization.Query(url);
    query.send(function (response) {
        elements.forEach(e => e.classList.remove("loading"));
        if (response.isError()) {
            console.error(
                "Error in query:",
                response.getMessage(),
                response.getDetailedMessage()
            );
            elements.forEach(e => e.classList.add("error"));
        }
        else {
            var data = response.getDataTable();
            console.log("URL:", url, "\nCallback:", f, "\nResponse:", data);
            try {
                f(data);
            }
            catch (error) {
                console.error(error);
                elements.forEach(e => e.classList.add("error"));
            }
        }
    });
}

/* Timestamps */

function daysSinceLocalEpoch(date) {
    var offset = date.getTimezoneOffset() * 60000;
    var offsetDate = date - offset;
    return Math.floor(offsetDate / 86400000);
}

function formatDate(date) {
    if ("Intl" in window) {
        return Intl.DateTimeFormat([], {"dateStyle": "short"}).format(date);
    }
    return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
}

function formatTime(date) {
    if ("Intl" in window) {
        return Intl.DateTimeFormat([], {"timeStyle": "short"}).format(date);
    }
    return date.getHours() + ":" + date.getMinutes();
}

function formatDateTime(date) {
    var today = daysSinceLocalEpoch(now);
    var day = daysSinceLocalEpoch(date);
    var addendum = " ";
    if (day == today) {
        addendum += "today";
    }
    else {
        if (day == today - 1) {
            addendum += "yesterday";
        }
        else if (day == today + 1) {
            addendum += "tomorrow";
        }
        else {
            addendum += "on " + formatDate(date);
        }
    }
    addendum += " at " + formatTime(date);
    return addendum;
}

function updateTimestamp(date) {
    var timestamp = document.getElementById("timestamp");
    timestamp.innerHTML = formatDateTime(date);
}

/* Events */

function getIcon(name) {
    var img = new Image();
    img.src = "https://krazete.github.io/sgm/image/official/" + name + ".png";
    return img;
}

function setEvent(id, title, contents, active) {
    var box = document.getElementById(id);
    box.innerHTML = "";

    var boxTitle = document.createElement("div");
    boxTitle.innerHTML = title;
    box.appendChild(boxTitle);

    var boxContents = document.createElement("div");
    for (var content of contents) {
        var boxContent = document.createElement("div");
        if (id == "dail" || id == "char") {
            var character = content.replace(/-F/, "f").replace(/\s|\./g, "");
            var icon = getIcon(character + "_MasteryIcon");
            boxContent.appendChild(icon);
        }
        else if (id == "rift" || id == "elem") {
            var icon = getIcon("ElementalIcon" + content);
            boxContent.appendChild(icon);
        }
        boxContent.innerHTML += content;
        boxContents.appendChild(boxContent);
    }
    box.appendChild(boxContents);

    if (active) {
        box.classList.add("active");
    }
    else {
        box.classList.remove("active");
    }
}

function updateEvents() {
    if (waitBuffer || attempts == 0) {
        return;
    }
    waitBuffer = true;
    attempts--;
    sendQuery("a:a", function (data) {
        /* `range=a:a` skips empty cells */
        /* `tq=select A` skips empty rows */
        lastCheck = new Date(data.getValue(0, 0) + "-17:00");
        updateTimestamp(lastCheck);

        setEvent(
            "dail",
            data.getValue(1, 0),
            data.getValue(2, 0).split(";"),
            true
        );

        for (var id in events) {
            setEvent(
                id,
                data.getValue(events[id].row, 0),
                [data.getValue(events[id].row + 1, 0)],
                data.getValue(events[id].row + 2, 0) > 0
            );
        }

        waitBuffer = false;
        propagateUpdate = true;
    }, Object.keys(events).concat("dail"));
}

/* Charts */

function redrawChart() {
    var element = document.getElementById("chart");
    element.classList.remove("error");
    if (events[selectedEvent].data.getNumberOfRows() <= 1) {
        var chart = new google.visualization.ColumnChart(element);
    }
    else {
        var chart = new google.visualization.LineChart(element);
    }
    var title = document.getElementById(selectedEvent).innerText
                .replace(/Current|Last|\n/g, " ")
                .replace(/Rift Element: (.+)/g, "Rift Battles: $1 Boss Node")
                .replace(/(.*SMYM.*):.*/g, "$1")
                .replace(/PF/g, "Prize Fight");
    chart.draw(events[selectedEvent].data, {
        title: title,
        titleTextStyle: {color: "white"},
        legend: {textStyle: {color: "white"}},
        hAxis: {
            textStyle: {color: "white"},
            gridlines: {color: "#1b2a41"},
            minorGridlines: {color: "#263b5a"}
        },
        vAxis: {
            textStyle: {color: "white"},
            gridlines: {color: "#1b2a41"},
            minorGridlines: {color: "#263b5a"}
        },
        backgroundColor: "transparent",
        colors: events[selectedEvent].colors,
        lineWidth: 5
    });
}

function checkChart(id) {
    if (events[id].data) {
        selectedEvent = id;
        redrawChart(id);
    }
    else {
        sendQuery(events[id].range, function (data) {
            for (var i = 0; i < data.getNumberOfColumns(); i++) {
                var typ = data.getColumnType(i);
                if (typ != "date" && typ != "number") {
                    data.removeColumn(i);
                    i--;
                }
            }
            console.log(data);
            events[id].data = data;
            checkChart(id);
        }, ["chart"]);
    }
}

/* Listeners */

function keepFresh() {
    now = new Date();
    var lastReset = now - (now - 61200000) % 86400000; /* 10PT/17UTC */
    if (lastCheck < lastReset) {
        if (lastCheck > 0) {
            document.documentElement.classList.add("stale");
        }
        updateEvents();
    }
    else if (propagateUpdate) {
        var nextReset = new Date(lastReset + 86400000);
        console.log("Next reset time is" + formatDateTime(nextReset) + "."); /* for DST debugging */

        propagateUpdate = false;
        document.documentElement.classList.remove("stale");
        for (var id in events) {
            events[id].data = false;
        }
        if (selectedEvent) {
            redrawChart();
        }
    }
    requestAnimationFrame(keepFresh);
}

function onClick(e) {
    if (typeof e.target != "undefined") {
        e = e.target;
    }
    if (Object.keys(events).includes(e.id)) {
        if (!e.classList.contains("loading") && !e.classList.contains("error")) {
            checkChart(e.id);
        }
    }
    else if (e != document.body) {
        onClick(e.parentElement);
    }
}

window.addEventListener("click", onClick);
window.addEventListener("resize", redrawChart);
