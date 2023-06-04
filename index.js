history.replaceState(null, "", location.origin + location.pathname);

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
        contentID: "",
        0: {dataID: "", data: false, range: "B4:B14,F4:M14", colors: ["#f97d9f", "#d96988", "#b95571", "#99415a", "gold", "#ecbe10", "goldenrod", "#c78c30"]},
        1: {dataID: "", data: false, range: "B4:E14", colors: ["white", "gray", "black"]}
    },
    char: {
        row: 6,
        contentID: "",
        0: {dataID: "", data: false, range: "B15:B25,E15:F25,K15:L25", colors: ["#f97d9f", "#b95571", "gold", "goldenrod"]},
        1: {dataID: "", data: false, range: "B15:D25,I15:J25", colors: ["white", "silver", "gray", "black"]}
    },
    elem: {
        row: 9,
        contentID: "",
        0: {dataID: "", data: false, range: "B26:B36,E26:F36", colors: ["gold", "silver"]},
        1: {dataID: "", data: false, range: "B26:D36", colors: ["white", "black"]}
    },
    medi: {
        row: 12,
        contentID: "",
        0: {dataID: "", data: false, range: "B37:B47,D37:D47", colors: ["#f97d9f"]},
        1: {dataID: "", data: false, range: "B37:D47", colors: ["white", "#f97d9f"]}
    },
    smym: {
        row: 15,
        contentID: "",
        0: {dataID: "", data: false, range: "B48:B58,E48:F58", colors: ["gold", "silver"]},
        1: {dataID: "", data: false, range: "B48:D58", colors: ["white", "black"]}
    },
    holi: {
        row: 18,
        contentID: "",
        0: {dataID: "", data: false, range: "B59:B69,D59:H69", colors: ["#f97d9f", "gold", "silver"]},
        1: {dataID: "", data: false, range: "B59:F69", colors: ["white", "#f97d9f"]}
    }
};
var selectedEvent;
var mode = 0;
var now = new Date();
var resetOffset = 61200000;
var lastEdit = new Date(0);
var stampIssue = {};
var waitUntil = 0;
var waitPrev = 34;
var waitTime = -21;
var propagating = false;
var offlineErrors = [];

function store(key, value) {
    return localStorage.setItem("sgmnow-" + key, value);
}

function retrieve(key) {
    return localStorage.getItem("sgmnow-" + key);
}

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
        console.error("The google object was not loaded. Cannot send Query.");
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

    if (id == "smym") {
        events.smym.contentID = "smym";
    }
    else if (id in events) { /* not dail */
        events[id].contentID = contents.join("").toLowerCase().replace(/[^a-z]/g, "");
    }
    store(id, JSON.stringify({
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

function updateTicker(nextReset) {
    var ticker = document.getElementById("ticker");
    if (nextReset) {
        ticker.innerHTML = "Resets" + formatDateTime(new Date(nextReset)) + ".";
    }
    else if (waitUntil == 0) {
        ticker.innerHTML = "";
    }
    else if ("onLine" in navigator && !navigator.onLine) {
        ticker.innerHTML = "Cannot reload.";
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
        store("time", lastEdit.getTime());

        waitUntil = now.getTime() + Math.abs(waitTime || 1) * 1000;
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

    var reaffirmChart = false;
    if (!("getNumberOfRows" in events[selectedEvent][mode].data)) { /* then it's JSON parsed storage */
        if (typeof google == "undefined") {
            console.error("The google object was not loaded. Cannot create DataTable.");
            element.classList.add("error");
            return;
        }
        events[selectedEvent][mode].data = new google.visualization.DataTable(events[selectedEvent][mode].data);
        reaffirmChart = true;
    }

    if (events[selectedEvent][mode].data.getNumberOfRows() <= 1) {
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
    chart.draw(events[selectedEvent][mode].data, {
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
        colors: events[selectedEvent][mode].colors,
        lineWidth: 5
    });

    if (reaffirmChart) { /* possible recursion hazard */
        updateChart(selectedEvent, mode, true);
    }
}

function updateChart(id, m, stealthy) {
    var box = document.getElementById(id);
    if (box.classList.contains("loading") || box.classList.contains("error")) {
        return;
    }
    if (events[id][m].dataID == events[id].contentID && events[id][m].data && !stealthy) {
        selectedEvent = id;
        redrawChart();
    }
    else {
        sendQuery(events[id][m].range, function (data) {
            for (var i = 0; i < data.getNumberOfColumns(); i++) {
                var typ = data.getColumnType(i);
                if (typ != "date" && typ != "number") {
                    data.removeColumn(i);
                    i--;
                }
            }
            events[id][m].dataID = events[id].contentID;
            events[id][m].data = data;
            if (!stealthy) {
                selectedEvent = id;
            }
            redrawChart();

            store(id + ["", "-x"][m] + "-chart-id", events[id].contentID);
            store(id + ["", "-x"][m] + "-chart", data.toJSON());
        }, stealthy ? [] : ["chart"]);
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
            updateEvents("onLine" in navigator && !navigator.onLine);
        }
        updateTicker();
    }
    else if (propagating) {
        waitUntil = 0;
        waitPrev = 0;
        waitTime = 1;
        propagating = false;
        document.documentElement.classList.remove("stale");
        updateTicker(lastReset + 86400000);
        if (selectedEvent) {
            updateChart(selectedEvent, mode);
        }
    }
    else if (
        stampIssue.timezoneOffset != now.getTimezoneOffset() ||
        stampIssue.fullYear != now.getFullYear() ||
        stampIssue.month != now.getMonth() ||
        stampIssue.date != now.getDate()
    ) {
        updateResetOffset();
        updateTimestamp();
        updateTicker(lastReset + 86400000);
    }
    requestAnimationFrame(keepFresh);
}

function initBoxes() {
    function clickBox() {
        updateChart(this.id, mode);
    }
    for (var id in events) {
        var box = document.getElementById(id);
        box.addEventListener("click", clickBox);
    }

    function changeMode() {
        mode = +this.checked;
        updateChart(selectedEvent, mode);
        store("mode", mode);
    }
    mode = parseInt(retrieve("mode") || 0);
    var hard = document.getElementById("tryhard");
    hard.checked = mode;
    hard.addEventListener("change", changeMode);

    function setStoredEvent(id) {
        var e = JSON.parse(retrieve(id));
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
    lastEdit = new Date(parseInt(retrieve("time")) || 0);
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
        updateTicker(lastReset + 86400000);
        for (var id in events) {
            events[id][0].dataID = retrieve(id + "-chart-id");
            events[id][0].data = JSON.parse(retrieve(id + "-chart"));
            events[id][1].dataID = retrieve(id + "-x-chart-id");
            events[id][1].data = JSON.parse(retrieve(id + "-x-chart"));
        }
        if (lastEdit >= lastReset) { /* if stale, skip and let keepFresh do it */
            reaffirmEvents();
        }
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
