var events = {
    "rift": {"row": 1, "range": "B3:B13,F3:M13", "data": false},
    "char": {"row": 12, "range": "B14:B24,E14:F24,K14:L24", "data": false},
    "elem": {"row": 23, "range": "B25:B35,E25:F35", "data": false},
    "medi": {"row": 34, "range": "B36:B46,D36:D46", "data": false},
    "smym": {"row": 45, "range": "B47:B57,D47:E57", "data": false},
    "holi": {"row": 56, "range": "B58:B68,D58:H68", "data": false}
};
var ce, lastCheck;

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
            catch (e) {
                console.error(e);
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
            var fn = content.replace(/-F/, "f").replace(/\s|\./g, "") + "_MasteryIcon";
            boxContent.appendChild(getIcon(fn));
        }
        else if (id == "rift" || id == "elem") {
            var fn = "ElementalIcon" + content;
            boxContent.appendChild(getIcon(fn));
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

function checkNow() {
    lastCheck = Date.now();
    var sheetTime = document.getElementById("sheet-time");
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
    }, ["dail"]);
    sendQuery("select A", function (data) {
        /* uses `tq=select A` because `range=a:a` skips empty cells */
        for (var id in events) {
            setEvent(
                id,
                data.getValue(events[id].row, 0),
                [data.getValue(events[id].row + 1, 0)],
                data.getValue(events[id].row + 2, 0) > 0
            );
        }
        var datenow = new Date(data.getValue(0, 0) + "-17:00");
        sheetTime.innerHTML = "Sheet last updated on " + datenow;
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
        colors: ["red", "orange", "yellow", "green", "blue", "indigo", "violet"],
        lineWidth: 5
    });
}

function checkChart(id) {
    console.log(id);
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
    var today = now - now % 86400000 - 25200000; /* refresh at 10am PT */
    var stale = lastCheck < today;
    if (stale) {
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
    if (typeof e.target !== "undefined") {
        e = e.target;
    }
    if (Object.keys(events).includes(e.id)) {
        if (!e.classList.contains("loading") && !e.classList.contains("error")) {
            checkChart(e.id);
        }
    }
    else if (e !== document.body) {
        onClick(e.parentElement);
    }
}

window.addEventListener("click", onClick);
window.addEventListener("resize", redraw);
