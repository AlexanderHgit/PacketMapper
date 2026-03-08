import usb.core
import usb.util
import usb.backend.libusb1
import sys
import json
import os
import keyboard
import time
import threading
import queue
backend = usb.backend.libusb1.get_backend(
    find_library=lambda x: os.path.join(os.path.dirname(__file__), "libusb-1.0.dll")
)

device = None
endpointAddress = None
maxPacketSize = None

inputs = {}
bytes_used = []
def save_mappings(path):
    global inputs 

    jsonMapping = [
        {'key': list(k), 'value': v}
        for k, v in inputs.items()
    ]

    with open(path, "w") as f:
        json.dump(jsonMapping, f, indent=4)
def list_devices():
    devices = usb.core.find(find_all=True, backend=backend)
    result = []

    for d in devices:
        try:
            manufacturer = usb.util.get_string(d, d.iManufacturer) if d.iManufacturer else "Unknown"
        except:
            manufacturer = "Unknown"

        try:
            product = usb.util.get_string(d, d.iProduct) if d.iProduct else "Unknown"
        except:
            product = "Unknown"

        result.append({
            "vendor_id": hex(d.idVendor),
            "product_id": hex(d.idProduct),
            "manufacturer": manufacturer,
            "product": product
        })

    send({"type": "device_list", "data": result})


def connect(vendor_id, product_id):
    global device, endpointAddress, maxPacketSize

    device = usb.core.find(
        idVendor=int(vendor_id, 16),
        idProduct=int(product_id, 16),
        backend=backend
    )

    if device is None:
        send({"type": "error", "data": "Device not found"})
        return
    device.set_configuration()
    endpoint = device[0][(0,0)][0]

    endpointAddress = endpoint.bEndpointAddress
    maxPacketSize = endpoint.wMaxPacketSize

    send({"type": "connected", "endpointAddress": endpointAddress,"packet_size":maxPacketSize,"vendorid":str(int(vendor_id, 16)),"productid":str(int(product_id, 16))})

def add_mapping(byte, bit, key):
    inputs[(byte, bit)] = key
    jsonMapping=[{'key':k, 'value': v} for k, v in inputs.items()]
    send({"type": "mapping", "data": json.dumps(jsonMapping)})
    if byte not in bytes_used:
        bytes_used.append(byte)


def load_mappings(path):
    global inputs
    with open(path, "r") as f:
        data = json.load(f)

    inputs.clear()

    for entry in data:
        byte, bit = entry["key"]
        value = entry["value"]
        inputs[(byte, bit)] = value


    jsonMapping = [
        {"key": list(k), "value": v}
        for k, v in inputs.items()
    ]

    send({
        "type": "mapping",
        "data": json.dumps(jsonMapping)
    })
def process_inputs(packet):
    for (byte, bit), key in inputs.items():
        if byte < len(packet):
            if packet[byte] & (1 << bit):
                keyboard.press(key)
            else:
                keyboard.release(key)

                
def remove_input(input_index):
    index = int(input_index)

    keys = list(inputs.keys())

    if 0 <= index < len(keys):
        key_to_remove = keys[index]
        inputs.pop(key_to_remove)

    jsonMapping = [
        {'key': list(k), 'value': v}
        for k, v in inputs.items()
    ]

    send({"type": "mapping", "data": json.dumps(jsonMapping)})

def send(obj):
    print(json.dumps(obj))
    sys.stdout.flush()

import threading
import queue

command_queue = queue.Queue()

def stdin_reader():
    while True:
        try:
            line = sys.stdin.readline()
            if line:
                command_queue.put(json.loads(line))
        except:
            pass

def main():
    list_devices()


    threading.Thread(target=stdin_reader, daemon=True).start()

    while True:


        while not command_queue.empty():
            msg = command_queue.get()

            if msg["type"] == "connect":
                connect(msg["vendor_id"], msg["product_id"])

            if msg["type"] == "add_mapping":
                add_mapping(msg["byte"], msg["bit"], msg["key"])
            if msg["type"] == "remove_input":
                try:
                    remove_input(msg["input"])
                except Exception as e:
                    send({"type": "command_error", "data": str(e)})
            if msg["type"] == "save_mappings":
                save_mappings(msg["path"])
            if msg["type"]=="load_mappings":
                try:
                    load_mappings(msg["path"])
                except Exception as e:
                    send({"type": "command_error", "data": str(e)})


        if device:
            try:
                data = device.read(endpointAddress, maxPacketSize, timeout=1000)
                process_inputs(data)
                send({"type": "packet", "data": list(data)})
            except Exception as e:
                send({"type": "error", "data": str(e)})

        time.sleep(0.01)
if __name__ == "__main__":
    import select
    main()