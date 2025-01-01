[
    {
        "id": "fa7ca32a.fff29",
        "type": "tab",
        "label": "Home Climate Control",
        "disabled": false,
        "info": "Flow to monitor and control environmental conditions using Sense HAT."
    },
    {
        "id": "96b2e8b0.38e248",
        "type": "comment",
        "z": "fa7ca32a.fff29",
        "name": "Raspberry Pi Sense HAT",
        "info": "Input from Sense HAT for environmental data (temperature, humidity, pressure).",
        "x": 200,
        "y": 100,
        "wires": []
    },
    {
        "id": "6ec3287d.d0a778",
        "type": "rpi-sensehat in",
        "z": "fa7ca32a.fff29",
        "name": "Sense HAT Data Input",
        "motion": false,
        "env": true,
        "stick": false,
        "x": 240,
        "y": 160,
        "wires": [
            [
                "8ed816ca.a8a1b8",
                "44cdd5b0.e4280c",
                "cabe049f.098698",
                "953c1a32.8ab5d8"
            ]
        ]
    },
    {
        "id": "8ed816ca.a8a1b8",
        "type": "function",
        "z": "fa7ca32a.fff29",
        "name": "Extract Temperature",
        "func": "var o = msg.payload;\nmsg.payload = o.temperature - 10; // Adjust offset for calibration if needed\nreturn msg;",
        "outputs": 1,
        "x": 550,
        "y": 260,
        "wires": [
            [
                "caa361ad.ab2b4"
            ]
        ]
    },
    {
        "id": "44cdd5b0.e4280c",
        "type": "function",
        "z": "fa7ca32a.fff29",
        "name": "Extract Humidity",
        "func": "var o = msg.payload;\nmsg.payload = o.humidity;\nreturn msg;",
        "outputs": 1,
        "x": 540,
        "y": 380,
        "wires": [
            [
                "4fce0192.e4806"
            ]
        ]
    },
    {
        "id": "cabe049f.098698",
        "type": "function",
        "z": "fa7ca32a.fff29",
        "name": "Extract Pressure",
        "func": "var o = msg.payload;\nmsg.payload = o.pressure / 10; // Convert to kPa\nreturn msg;",
        "outputs": 1,
        "x": 550,
        "y": 500,
        "wires": [
            [
                "8e8d1308.d82b9"
            ]
        ]
    },
    {
        "id": "caa361ad.ab2b4",
        "type": "ui_gauge",
        "z": "fa7ca32a.fff29",
        "name": "Temperature Gauge",
        "group": "ae9303ff.f557e",
        "order": 0,
        "width": 6,
        "height": 4,
        "gtype": "gage",
        "title": "Temperature",
        "label": "°C",
        "format": "{{value | number:1}}",
        "min": -10,
        "max": 50,
        "colors": [
            "#00b500",
            "#e6e600",
            "#ca3838"
        ],
        "x": 930,
        "y": 260,
        "wires": []
    },
    {
        "id": "4fce0192.e4806",
        "type": "ui_gauge",
        "z": "fa7ca32a.fff29",
        "name": "Humidity Gauge",
        "group": "ae9303ff.f557e",
        "order": 1,
        "width": 6,
        "height": 4,
        "gtype": "gage",
        "title": "Humidity",
        "label": "%",
        "format": "{{value | number:1}}",
        "min": 0,
        "max": 100,
        "colors": [
            "#00b500",
            "#e6e600",
            "#ca3838"
        ],
        "x": 940,
        "y": 380,
        "wires": []
    },
    {
        "id": "8e8d1308.d82b9",
        "type": "ui_gauge",
        "z": "fa7ca32a.fff29",
        "name": "Pressure Gauge",
        "group": "ae9303ff.f557e",
        "order": 2,
        "width": 6,
        "height": 4,
        "gtype": "gage",
        "title": "Pressure",
        "label": "kPa",
        "format": "{{value | number:1}}",
        "min": 90,
        "max": 110,
        "colors": [
            "#00b500",
            "#e6e600",
            "#ca3838"
        ],
        "x": 940,
        "y": 500,
        "wires": []
    },
    {
        "id": "953c1a32.8ab5d8",
        "type": "debug",
        "z": "fa7ca32a.fff29",
        "name": "Debug Info",
        "active": true,
        "tosidebar": true,
        "console": false,
        "tostatus": false,
        "complete": "payload",
        "x": 900,
        "y": 60,
        "wires": []
    },
    {
        "id": "ae9303ff.f557e",
        "type": "ui_group",
        "name": "Home Climate Dashboard",
        "tab": "b5d9ecdf.37e0c",
        "disp": true,
        "width": 6,
        "collapse": false
    },
    {
        "id": "b5d9ecdf.37e0c",
        "type": "ui_tab",
        "name": "Home Climate Dashboard",
        "icon": "dashboard",
        "disabled": false,
        "hidden": false
    }
]
