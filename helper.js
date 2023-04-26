function getColors(color0, color1, n, overflow) {
    var c0 = [
        Math.floor(color0 / 0x10000) % 0x100,
        Math.floor(color0 / 0x100) % 0x100,
        color0 % 0x100
    ];
    var c1 = [
        Math.floor(color1 / 0x10000) % 0x100,
        Math.floor(color1 / 0x100) % 0x100,
        color1 % 0x100
    ];
    var colors = new Array(n + 1 + (overflow ? overflow : 0)).fill().map(
        (_, i) => "#" + c0.map(
            (h, j) => Math.floor(h + (c1[j] - h) * i / n).toString(16).padStart(2, 0)
        ).join("")
    );
    return colors;
}
console.log(getColors(0xee4f87, 0xaa0037, 4));
console.log(getColors(0xffd700, 0xdaa520, 2, 2));
