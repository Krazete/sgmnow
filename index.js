var events = {
    "rift": {"row": 1, "range": "B3:B13,F3:M13", "data": false, "colors": ["#ee4f87", "#dd3b73", "#cc275f", "#bb134b", "gold", "#ecbe10", "goldenrod", "#c78c30"]},
    "char": {"row": 4, "range": "B14:B24,E14:F24,K14:L24", "data": false, "colors": ["#ee4f87", "#cc275f", "gold", "goldenrod"]},
    "elem": {"row": 7, "range": "B25:B35,E25:F35", "data": false, "colors": ["gold", "silver"]},
    "medi": {"row": 10, "range": "B36:B46,D36:D46", "data": false, "colors": ["#ee4f87"]},
    "smym": {"row": 13, "range": "B47:B57,E47:F57", "data": false, "colors": ["gold", "silver"]},
    "holi": {"row": 16, "range": "B58:B68,D58:H68", "data": false, "colors": ["#ee4f87", "gold", "silver"]}
};
var ce, lastCheck, checkBuffer = 0;

google.charts.load("current", {"packages": ["corechart"]});
google.charts.setOnLoadCallback(checkNow);

function sendQuery(q, f, ids) {
    var elements = ids.map(id => document.getElementById(id));
    elements.forEach(e => {
        e.innerHTML = "";
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

/* Events */

function getIcon(name) {
    var img = new Image();
    img.src = "https://krazete.github.io/sgm/image/official/" + name + ".png";
    return img;
}

function setEvent(id, title, contents, active) {
    var box = document.getElementById(id);

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

    var sheetTime = document.getElementById("sheet-time");
function checkNow() {
    if (checkBuffer > 0) {
        return;
    }
    checkBuffer = 2;
    sendQuery("1:1", function (data) {
        var contents = [];
        var n = data.getNumberOfColumns();
        for (var i = 1; i < n; i++) {
            contents.push(data.getValue(0, i));
        }
        setEvent(
            "dail",
            data.getValue(0, 0),
            contents,
            true
        );
        checkBuffer--;
    }, ["dail"]);
    sendQuery("a:a", function (data) {
        /* `range=a:a` skips empty cells */
        /* `tq=select A` skips empty rows */
        for (var id in events) {
            setEvent(
                id,
                data.getValue(events[id].row, 0),
                [data.getValue(events[id].row + 1, 0)],
                data.getValue(events[id].row + 2, 0) > 0
            );
        }
        lastCheck = new Date(data.getValue(0, 0) + "-17:00");
        var sheetTime = document.getElementById("sheet-time");
        sheetTime.innerHTML = ", last updated on " + lastCheck;
        checkBuffer--;
    }, Object.keys(events));
}

/* Charts */

function redraw() {
    var element = document.getElementById("chart");
    if (events[ce].data.getNumberOfRows() <= 1) {
        var chart = new google.visualization.ColumnChart(element);
    }
    else {
        var chart = new google.visualization.LineChart(element);
    }
    var title = document.getElementById(ce).innerText
                .replace(/Current|Last|\n/g, " ")
                .replace(/Rift Element: (.+)/g, "Rift Battles: $1 Boss Node")
                .replace(/(.*SMYM.*):.*/g, "$1")
                .replace(/PF/g, "Prize Fight");
    chart.draw(events[ce].data, {
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
        colors: events[ce].colors,
        lineWidth: 5
    });
}

function checkChart(id) {
    if (events[id].data) {
        ce = id;
        redraw(id);
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
    var now = Date.now();
    var refreshTime = now - now % 86400000 - 25200000; /* 10am PT */
    if (lastCheck < refreshTime) {
        for (var id in events) {
            events[id].data = false;
        }
        checkNow();
        if (ce) {
            redraw();
        }
    }
    requestAnimationFrame(keepFresh);
}

keepFresh();

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
window.addEventListener("resize", redraw);
