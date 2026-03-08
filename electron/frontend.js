
var lastPacketData = null;

const devicesDiv = document.getElementById("devices");
const packetDiv = document.getElementById("packet");
const byteSelect = document.getElementById("byteSelect");
const bitSelect = document.getElementById("bitSelect");
const keyInput = document.getElementById("keyInput");
const mappingsDiv = document.getElementById("mappings");

let inputs = [];

document.getElementById("loadMappingsBtn").addEventListener('click', () => {
    window.api.loadMappings();
});

document.getElementById("saveMappingsBtn").addEventListener('click', () => {
    window.api.saveMappings();
});

window.api.onPythonMessage((message) => {

    if (message.type === "device_list") {
        devicesDiv.innerHTML = "";

        message.data.forEach(device => {
            const btn = document.createElement("button");

            btn.innerText = `${device.product} (${device.vendor_id}:${device.product_id})`;

            btn.onclick = () => window.api.connectDevice(device);

            devicesDiv.appendChild(btn);
            devicesDiv.appendChild(document.createElement("br"));
        });
    }

    if (message.type === "connected") {

        byteSelect.innerHTML = "";

        for (let i = 0; i < message.packet_size; i++) {
            const opt = document.createElement("option");

            opt.value = i;
            opt.text = i;

            byteSelect.appendChild(opt);
        }
    }

    if (message.type === "packet" && message.data.toString() !== lastPacketData) {

        lastPacketData = message.data.toString();

        packetDiv.innerHTML =
            "<table style='font-family: monospace'>" +
            "<tr><th>Byte</th><th>Dec</th><th>Binary</th></tr>" +
            "<tr><th></th><th></th><th>76543210</th></tr>" +
            message.data.map((b, i) =>
                `<tr>
                    <td>${i}</td>
                    <td>${b.toString().padStart(3,'0')}</td>
                    <td>${b.toString(2).padStart(8,'0')}</td>
                </tr>`
            ).join("") +
            "</table>";
    }

    if (message.type === "mapping") {

        const parsedMappings = JSON.parse(message.data);

        inputs = [];

        for (const mapping of parsedMappings) {
            inputs.push([
                mapping["key"][0],
                mapping["key"][1],
                mapping["value"]
            ]);
        }

        mappingsDiv.innerHTML =
            "<table style='font-family: monospace'>" +
            "<tr><th>Byte</th><th>Binary</th><th>Key</th><th></th></tr>" +
            inputs.map((b, index) =>
                `<tr>
                    <td>${b[0]}</td>
                    <td>${b[1].toString(2).padStart(8,'0')}</td>
                    <td>${b[2]}</td>
                    <td>
                        <button class="removeBtn" data-index="${index}">Remove</button>
                    </td>
                </tr>`
            ).join("") +
            "</table>";


        document.querySelectorAll(".removeBtn").forEach(btn => {

            btn.addEventListener("click", () => {

                const index = btn.dataset.index;

                window.api.removeInput(index);
            });

        });
    }
});

document.getElementById("addBtn").onclick = () => {

    const mapping = {
        byte: parseInt(byteSelect.value),
        bit: parseInt(bitSelect.value),
        key: keyInput.value
    };

    window.api.addMapping(mapping);
};
