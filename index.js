if ("onLine" in navigator && !navigator.onLine) {
    disconnect();
    window.addEventListener("online", e => location.reload()); /* ensure loader.js is loaded */
}
else {
    window.addEventListener("offline", disconnect);
    window.addEventListener("online", reconnect);
}

if (typeof google == "undefined") {
    window.addEventListener("load", keepFresh);
}
else { /* skip if navigator.onLine is a false positive */
    google.charts.load("current", {packages: ["corechart"]});
    google.charts.setOnLoadCallback(keepFresh);
}

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
var now = new Date();
var resetOffset = 61200000;
var lastLastEdit = 0;
var lastEdit = new Date(0);
var stampIssue = {};
var waitUntil = 0;
var waitPrev = 0;
var waitTime = 1;
var propagating = false;
var offlineErrors = [];

function updateResetOffset() {
    if ("Intl" in window) {
        var dtf = Intl.DateTimeFormat("en-US", {
            timeZone: "America/Los_Angeles",
            timeZoneName: "long"
        }).format();
        if (dtf.indexOf("Standard") >= 0) { /* vs Daylight */
            resetOffset = 64800000;
            return;
        }
    }
    resetOffset = 61200000;
}
updateResetOffset();

function sendQuery(q, f, ids) {
    var elements = ids.map(id => document.getElementById(id));
    elements.forEach(e => {
        e.classList.remove("error");
        e.classList.add("loading");
    });
    var offlineWhenSent = "onLine" in navigator && !navigator.onLine;
    if (offlineWhenSent) {
        elements.forEach(e => {
            e.classList.remove("loading");
            e.classList.add("error");
            offlineErrors.push(e);
        });
        /* no return; since navigator.onLine could be a false negative */
    }

    if (typeof google == "undefined") { /* if navigator.onLine is a false positive */
        console.error("The google object was not loaded.");
        elements.forEach(e => {
            e.classList.remove("loading");
            e.classList.add("error");
        });
        return;
    }

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
            if (!offlineWhenSent) {
                elements.forEach(e => e.classList.add("error"));
            }
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
    // query.send causes an uncatchable error
    // if navigator.onLine is a false positive and
    // if google scripts load from the browser cache
    // e.g. simulate offline in developer console and then ctrl+shift+r
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
    else if (resetOffset <= -86400000 || resetOffset >= 86400000) { /* max offset is 24:00 */
        updateResetOffset(); /* for debug case `resetOffset = now` (force stale) */
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
        else if (id == "medi") {
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

    localStorage.setItem("sgmnow-" + id, JSON.stringify({
        title: title,
        contents: contents,
        active: active
    }));
}

function updateTimestamp() {
    var timestamp = document.getElementById("timestamp");
    timestamp.innerHTML = formatDateTime(lastEdit);

    stampIssue.timezoneOffset = now.getTimezoneOffset();
    stampIssue.fullYear = now.getFullYear();
    stampIssue.month = now.getMonth();
    stampIssue.date = now.getDate();
}

function updateTicker() {
    var ticker = document.getElementById("ticker");
    if (waitUntil == 0 || "onLine" in navigator && !navigator.onLine) {
        ticker.innerHTML = "";
    }
    else if (waitUntil == Infinity) {
        ticker.innerHTML = "Fetching data...";
    }
    else {
        var s = Math.ceil((waitUntil - now) / 1000);
        ticker.innerHTML = "Wait " + s + "s.";
    }
}

function updateEvents(stealthy) {
    lastLastEdit = lastEdit;
    sendQuery("a:a", function (data) {
        /* `range=a:a` skips empty cells */
        /* `tq=select A` skips empty rows */
        lastEdit = new Date(data.getValue(0, 0) + getZ());
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
        localStorage.setItem("sgmnow-time", lastEdit.getTime());

        waitUntil = now.getTime() + waitTime * 1000;
        var w = waitPrev;
        waitPrev = waitTime;
        waitTime += w;
        propagating = true;
    }, stealthy ? [] : Object.keys(events).concat("dail"));
}

/* Charts */

function redrawChart() {
    if (!selectedEvent) {
        return;
    }
    var element = document.getElementById("chart");
    element.classList.remove("error");
    if (!("getNumberOfRows" in events[selectedEvent].data)) { /* then it's JSON parsed storage */
        events[selectedEvent].data = new google.visualization.DataTable(events[selectedEvent].data);
    }
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
            format: "MMMM yyyy",
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

            localStorage.setItem("sgmnow-" + id + "-chart", data.toJSON());
        }, ["chart"]);
    }
}

/* Listeners */

function keepFresh() {
    now = new Date();
    var lastReset = now - (now - resetOffset) % 86400000; /* 10PT/17UTC */
    if (lastEdit < lastReset) {
        if (lastEdit > 0) {
            document.documentElement.classList.add("stale");
        }
        if (now > waitUntil) {
            waitUntil = Infinity;
            updateEvents();
        }
        updateTicker();
    }
    else if (propagating) {
        waitUntil = 0;
        waitPrev = 0;
        waitTime = 1;
        propagating = false;
        document.documentElement.classList.remove("stale");
        if (lastLastEdit < lastEdit || lastLastEdit > lastEdit) { /* dates never equal */
            for (var id in events) {
                events[id].data = false;
                localStorage.removeItem("sgmnow-" + id + "-chart");
            }
        }
        updateTicker();
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

    function setStoredEvent(id) {
        var e = JSON.parse(localStorage.getItem("sgmnow-" + id));
        setEvent(id, e.title, e.contents, e.active);
        document.getElementById(id).classList.remove("loading");
    }
    function reaffirmEvents() {
        try {
            updateEvents(true);
        }
        catch (e) {
            requestAnimationFrame(reaffirmEvents);
        }
    }
    lastEdit = new Date(parseInt(localStorage.getItem("sgmnow-time")) || 0);
    if (lastEdit > 0) {
        var lastReset = now - (now - resetOffset) % 86400000;
        if (lastEdit < lastReset) {
            document.documentElement.classList.add("stale");
        }
        setStoredEvent("dail");
        for (var id in events) {
            setStoredEvent(id);
        }
        updateTimestamp();
        for (var id in events) {
            events[id].data = JSON.parse(localStorage.getItem("sgmnow-" + id + "-chart"));
        }
        reaffirmEvents();
    }
}

function disconnect() {
    document.documentElement.classList.add("offline");
}

function reconnect() {
    document.documentElement.classList.remove("offline");
    if (waitUntil == Infinity) {
        waitUntil = 0;
    }
    offlineErrors.forEach(e => { /* probably only clears chart */
        e.classList.remove("error");
    });
    offlineErrors = [];
}

window.addEventListener("DOMContentLoaded", initBoxes);
window.addEventListener("resize", redrawChart);
