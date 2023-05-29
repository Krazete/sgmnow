var events = {
    rift: {
        row: 3,
        range: "B4:B14,F4:M14", 
        colors: ["#f97d9f", "#d96988", "#b95571", "#99415a", "gold", "#ecbe10", "goldenrod", "#c78c30"],
        data: false
    },
    char: {
        row: 6,
        range: "B15:B25,E15:F25,K15:L25",
        colors: ["#f97d9f", "#b95571", "gold", "goldenrod"],
        data: false
    },
    elem: {
        row: 9,
        range: "B26:B36,E26:F36", 
        colors: ["gold", "silver"],
        data: false
    },
    medi: {
        row: 12,
        range: "B37:B47,D37:D47", 
        colors: ["#f97d9f"],
        data: false
    },
    smym: {
        row: 15,
        range: "B48:B58,E48:F58", 
        colors: ["gold", "silver"],
        data: false
    },
    holi: {
        row: 18,
        range: "B59:B69,D59:H69", 
        colors: ["#f97d9f", "gold", "silver"],
        data: false
    }
};
var selectedEvent;
var now;
var resetOffset = 61200000;
var lastCheck = 0;
var stampIssue = {};
var waitUntil = 0;
var waitPrev = 0;
var waitTime = 1;
var propagating = false;

function updateResetOffset() {
    if ("Intl" in window) {
        var dtf = Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            timeZoneName: "long"
        }).format();
        if (dtf.indexOf("Standard") >= 0) { /* vs Daylight */
            resetOffset = 64800000;
        }
    }
}
updateResetOffset();

google.charts.load("current", {packages: ["corechart"]});
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
        return Intl.DateTimeFormat([], {dateStyle: "short"}).format(date);
    }
    return date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
}

function formatTime(date) {
    if ("Intl" in window) {
        return Intl.DateTimeFormat([], {timeStyle: "short"}).format(date);
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

/* Events */

function getZ() { /* too robust tbh; this won't always match sheet time but w/e */
    if (resetOffset == 0) {
        return "Z";
    }
    var a = Math.abs(resetOffset);
    var h = Math.floor(a / 3600000).toString().padStart(2, "0");
    var m = Math.floor(a % 3600000 / 60000).toString().padStart(2, "0");
    var sign = resetOffset > 0 ? "-" : "+";
    return sign + h + ":" + m;
}

function getIcon(name, alt) {
    var img = new Image();
    img.src = "https://krazete.github.io/sgm/image/official/" + name + ".png";
    img.alt = alt;
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
            var icon = getIcon(character + "_MasteryIcon", content);
            boxContent.appendChild(icon);
        }
        else if (id == "rift" || id == "elem") {
            var icon = getIcon("ElementalIcon" + content, content);
            boxContent.appendChild(icon);
        }
        else if (id == "medi) {
            var icon = new Image();
            icon.src = "https://krazete.github.io/sgmtree/img/SoftCurrency.png";
            icon.alt = "Canopy Coin";
            boxContent.appendChild(icon);
        }
        else if (id == "smym") {
            var icon = getIcon("BB-Frame1", "Blockbuster");
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

function updateTimestamp() {
    var timestamp = document.getElementById("timestamp");
    timestamp.innerHTML = formatDateTime(lastCheck);

    stampIssue.timezoneOffset = now.getTimezoneOffset();
    stampIssue.fullYear = now.getFullYear();
    stampIssue.month = now.getMonth();
    stampIssue.date = now.getDate();
}

function updateEvents() {
    sendQuery("a:a", function (data) {
        /* `range=a:a` skips empty cells */
        /* `tq=select A` skips empty rows */
        lastCheck = new Date(data.getValue(0, 0) + getZ());
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
        updateTimestamp();
        waitUntil = now.getTime() + waitTime * 1000;
        var w = waitPrev;
        waitPrev = waitTime;
        waitTime += w;
        propagating = true;
    }, Object.keys(events).concat("dail"));
}

/* Charts */

function redrawChart() {
    if (!selectedEvent) {
        return;
    }
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
    var thin = innerWidth < 650;
    chart.draw(events[selectedEvent].data, {
        chartArea: thin ? {left: "20%", width: "75%"} : {},
        title: title,
        titleTextStyle: {color: "white"},
        legend: {
            textStyle: {color: "white"},
            position: thin ? "bottom" : "right"
        },
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

function updateChart(id) {
    var box = document.getElementById(id);
    if (box.classList.contains("loading") || box.classList.contains("error")) {
        return;
    }
    if (events[id].data) {
        selectedEvent = id;
        redrawChart();
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
            events[id].data = data;
            selectedEvent = id;
            redrawChart();
        }, ["chart"]);
    }
}

/* Listeners */

function keepFresh() {
    now = new Date();
    var lastReset = now - (now - resetOffset) % 86400000; /* 10PT/17UTC */
    if (lastCheck < lastReset) {
        if (lastCheck > 0) {
            document.documentElement.classList.add("stale");
        }
        if (now > waitUntil) {
            waitUntil = Infinity;
            updateEvents();
        }
    }
    else if (propagating) {
        waitUntil = 0;
        waitPrev = 0;
        waitTime = 1;
        propagating = false;
        document.documentElement.classList.remove("stale");
        for (var id in events) {
            events[id].data = false;
        }
        if (selectedEvent) {
            updateChart(selectedEvent);
        }
        var nextReset = new Date(lastReset + 86400000); /* for DST debugging */
        console.log("Next reset is" + formatDateTime(nextReset) + ".");
    }
    else if (
        stampIssue.timezoneOffset != now.getTimezoneOffset() ||
        stampIssue.fullYear != now.getFullYear() ||
        stampIssue.month != now.getMonth() ||
        stampIssue.date != now.getDate()
    ) {
        updateResetOffset();
        updateTimestamp();
    }
    requestAnimationFrame(keepFresh);
}

function initBoxes() {
    function clickBox() {
        updateChart(this.id);
    }
    for (var id in events) {
        var box = document.getElementById(id);
        box.addEventListener("click", clickBox);
    }
}

window.addEventListener("DOMContentLoaded", initBoxes);
window.addEventListener("resize", redrawChart);
