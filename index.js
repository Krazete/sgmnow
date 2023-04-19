var events = {
    "rift": {"range":  "B3:M13", "row":  1},
    "char": {"range": "B14:M24", "row": 12},
    "elem": {"range": "B25:E35", "row": 23},
    "medi": {"range": "B36:D46", "row": 34},
    "smym": {"range": "B47:E57", "row": 45},
    "holi": {"range": "B58:G68", "row": 56}
};
var data, options;

google.charts.load("current", {"packages": ["corechart"]});
google.charts.setOnLoadCallback(checkNow);

function sendQuery(q, f, ids) {
    var elements = ids.map(id => document.getElementById(id));
    elements.forEach(e => e.classList.add("loading"));

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

function setEvent(id, title, contents, active) {
    var box = document.getElementById(id);

    var boxTitle = document.createElement("div");
    boxTitle.innerHTML = title;
    box.appendChild(boxTitle);

    var boxContents = document.createElement("div");
    for (var content of contents) {
        var boxContent = document.createElement("div");
        if (id == "dail" || id == "char") {
            var img = new Image();
            img.src = "https://krazete.github.io/sgm/image/official/" + content.replace(/-F/, "f").replace(/\s|\./g, "") + "_MasteryIcon.png";
            boxContent.appendChild(img);
        }
        else if (id == "rift" || id == "elem") {
            var img = new Image();
            img.src = "https://krazete.github.io/sgm/image/official/ElementalIcon" + content + ".png";
            boxContent.appendChild(img);
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
        )
    }, ["dail"]);
    sendQuery("select A", function (data) { /* uses `tq=select A` because `range=a:a` skips empty cells */
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
    }, ["rift", "char", "elem", "medi", "smym", "holi"]);
}

function redraw() {
    var element = document.getElementById("chart");
    var chart = new google.visualization.LineChart(element);
    chart.draw(data, options);
}

function drawChartRift() {
    sendQuery(events.rift.q, function (d) { // todo: should be B3:U13
    // sendQuery("now!B14:Z24", function (data) {
        data = d;
        options = {
            title: "Rift",
            backgroundColor: "transparent",
            hAxis: {title: 'Date'},
            vAxis: {title: 'Score', viewWindow: {min: 900}}
        };
        redraw();
    });
}

function openChart(id) {
    var chartArea = 0;
    var box = document.getElementById("chart-time");
}

window.addEventListener("resize", redraw);
