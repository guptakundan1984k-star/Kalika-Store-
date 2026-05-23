import { Order, CartItem } from '../types';

// ESC/POS Constants
const ESC = 0x1b;
const GS = 0x1d;

const CMD_INIT = new Uint8Array([ESC, 0x40]);
const CMD_ALIGN_LEFT = new Uint8Array([ESC, 0x61, 0x00]);
const CMD_ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const CMD_ALIGN_RIGHT = new Uint8Array([ESC, 0x61, 0x02]);

const CMD_FONT_NORMAL = new Uint8Array([ESC, 0x21, 0x00]);
const CMD_FONT_BOLD = new Uint8Array([ESC, 0x21, 0x08]);
const CMD_DOUBLE_SIZE = new Uint8Array([GS, 0x21, 0x11]); // Double height + width
const CMD_RESET_SIZE = new Uint8Array([GS, 0x21, 0x00]);

const CMD_FEED_LINES = (lines: number) => new Uint8Array([ESC, 0x64, lines]);
const CMD_PAPER_CUT = new Uint8Array([GS, 0x56, 0x01]); // Solid partial cut

/**
 * Align columns perfectly in a 32-column grid.
 * Width allocation:
 * Item Name: 15 chars (left aligned)
 * Qty: 3 chars (centered)
 * Price: 6 chars (right aligned)
 * Total: 6 chars (right aligned)
 * Spacing between columns: 1 char
 * Total: 15 + 1 + 3 + 1 + 5 + 1 + 6 = 32 columns.
 */
export function formatReceiptLine(item: string, qty: string, price: string, total: string): string {
  // Pad or truncate item name to 14 chars
  let namePart = item;
  if (namePart.length > 14) {
    namePart = namePart.substring(0, 14);
  } else {
    namePart = namePart.padEnd(14, ' ');
  }

  // Pad quantity to 3 chars
  const qtyPart = qty.padStart(3, ' ');

  // Pad price to 5 chars
  const pricePart = price.padStart(5, ' ');

  // Pad total to 6 chars
  const totalPart = total.padStart(6, ' ');

  return `${namePart} ${qtyPart} ${pricePart} ${totalPart}`;
}

/**
 * Builds ESC/POS layout for a 2-inch thermal printer (32 characters width)
 */
export function buildEscPosBytes(order: Order): Uint8Array {
  const chunks: Uint8Array[] = [];

  function write(bytes: Uint8Array) {
    chunks.push(bytes);
  }

  function writeText(text: string) {
    const encoder = new TextEncoder();
    chunks.push(encoder.encode(text));
  }

  // 1. Initialize
  write(CMD_INIT);

  // 2. Center Align & Double Size Bold Heading (Kalika Store)
  write(CMD_ALIGN_CENTER);
  write(CMD_DOUBLE_SIZE);
  write(CMD_FONT_BOLD);
  writeText("Kalika Store\n");

  // 3. Reset scaling, keep bold for horizontal divider line flanking
  write(CMD_RESET_SIZE);
  write(CMD_FONT_BOLD);
  writeText("-- Thank You! Visit Again --\n");
  write(CMD_FONT_NORMAL);

  // 4. Double Separator
  writeText("--------------------------------\n");

  // 5. Left Align Order Details
  write(CMD_ALIGN_LEFT);
  const billNo = order.id ? order.id.slice(-6).toUpperCase() : "1025";
  const orderDate = new Date(order.createdAt || Date.now());
  const dateStr = orderDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  writeText(`Bill No.  : ${billNo}\n`);
  writeText(`Date      : ${dateStr}\n`);

  // Cashier and Time on same aligned row
  const timeLabel = `Time      : ${timeStr}`; // normally ~20 chars
  const cashierLabel = "Cashier : 01"; // 12 chars
  const timeCashierSpacing = Math.max(0, 32 - timeLabel.length - cashierLabel.length);
  writeText(`${timeLabel}${"".padStart(timeCashierSpacing, " ")}${cashierLabel}\n`);

  // 6. Table Header Separator
  writeText("--------------------------------\n");
  writeText("Item            Qty  Rate Amount\n");
  writeText("--------------------------------\n");

  // 7. Render dynamic item rows with line wrapping
  let totalQty = 0;
  order.items.forEach(itm => {
    totalQty += itm.quantity;
    const rateNum = Number(itm.price || 0);
    const amountNum = rateNum * itm.quantity;

    // Formatting helper to perfectly align columns on a 32-column roll
    const line1ItemWidth = 15;
    const qtyStr = itm.quantity.toString().padStart(3); // 3 chars
    const rateStr = rateNum.toFixed(2).padStart(6); // 6 chars
    const amtStr = amountNum.toFixed(2).padStart(7); // 7 chars
    
    // Smart wrapped item parser
    const words = itm.name.split(" ");
    const nameSegments: string[] = [];
    let currentSegment = "";
    
    words.forEach(word => {
      if (currentSegment === "") {
        currentSegment = word;
      } else if ((currentSegment + " " + word).length <= line1ItemWidth) {
        currentSegment += " " + word;
      } else {
        nameSegments.push(currentSegment);
        currentSegment = word;
      }
    });
    if (currentSegment !== "") {
      nameSegments.push(currentSegment);
    }
    if (nameSegments.length === 0) nameSegments.push("");

    // Render line 1 with full parameters
    const firstNamePart = nameSegments[0].padEnd(line1ItemWidth, ' ');
    writeText(`${firstNamePart} ${qtyStr} ${rateStr} ${amtStr}\n`);

    // Render line 2+ with aligned wrapped segment text only
    for (let idx = 1; idx < nameSegments.length; idx++) {
      writeText(`${nameSegments[idx].padEnd(line1ItemWidth, ' ')}\n`);
    }
  });

  writeText("--------------------------------\n");

  // 8. Total Items Row
  const totalItemsLabel = `Total Items : ${totalQty}`; // e.g. "Total Items : 8" -> 15 chars
  const subtotalText = Number(order.total || 0).toFixed(2); // e.g. "200.00" -> 6 chars
  const itemsSpacing = Math.max(0, 32 - totalItemsLabel.length - subtotalText.length);
  writeText(`${totalItemsLabel}${"".padStart(itemsSpacing, " ")}${subtotalText}\n`);

  writeText("--------------------------------\n");

  // 9. Grand Total Row with Bold & Large text
  write(CMD_FONT_BOLD);
  const grandLabel = "Grand Total"; // 11 chars
  const grandValue = `Rs.${Number(order.total || 0).toFixed(2)}`; // e.g. "Rs.200.00" -> 9 chars
  const grandSpacing = Math.max(0, 32 - grandLabel.length - grandValue.length);
  writeText(`${grandLabel}${"".padStart(grandSpacing, " ")}${grandValue}\n`);
  write(CMD_FONT_NORMAL);

  writeText("--------------------------------\n");

  // 10. Payment Info Row
  const payMode = `Payment Mode : ${order.paymentMethod || "Cash"}`;
  const paidAmt = `Paid Amount : Rs.${Number(order.total || 0).toFixed(2)}`;
  // If combined is too broad, print on separate lines or nicely aligned
  if ((payMode + "   " + paidAmt).length <= 32) {
    const paySpacing = Math.max(0, 32 - payMode.length - paidAmt.length);
    writeText(`${payMode}${"".padStart(paySpacing, " ")}${paidAmt}\n`);
  } else {
    writeText(`${payMode}\n${paidAmt}\n`);
  }
  
  writeText("--------------------------------\n");

  // 11. Center Aligned Footer
  write(CMD_ALIGN_CENTER);
  write(CMD_DOUBLE_SIZE);
  write(CMD_FONT_BOLD);
  writeText("Thank You!\n");

  write(CMD_RESET_SIZE);
  writeText("* Visit Again *\n");
  write(CMD_FONT_NORMAL);

  // 12. Feed & Cut
  write(CMD_FEED_LINES(4));
  write(CMD_PAPER_CUT);

  // Combine chunks into a single Uint8Array
  let totalLength = 0;
  chunks.forEach(chunk => totalLength += chunk.length);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach(chunk => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

/**
 * Handles HTML Iframe Print Fallback
 * Perfect 58mm POS tape alignment with large columns, small price/qty details, bold grand totals
 */
export function printViaIframe(order: Order) {
  const iframeId = 'hidden-thermal-print-iframe';
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }

  const billNo = order.id ? order.id.slice(-6).toUpperCase() : "1025";
  const orderDate = new Date(order.createdAt || Date.now());
  const dateStr = orderDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = orderDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  let totalQty = 0;
  const itemsRows = order.items.map(itm => {
    totalQty += itm.quantity;
    return `
      <tr style="border-bottom: 1px dashed #000;">
        <td style="font-size: 12px; font-weight: bold; padding: 6px 0; max-width: 120px; word-wrap: break-word; text-align: left;">
          ${itm.name}
        </td>
        <td style="text-align: center; font-size: 12px; font-weight: 500; padding: 6px 0;">
          ${itm.quantity}
        </td>
        <td style="text-align: right; font-size: 12px; font-weight: 500; padding: 6px 0;">
          ${itm.price.toFixed(2)}
        </td>
        <td style="text-align: right; font-size: 12px; font-weight: bold; padding: 6px 0;">
          ${(itm.price * itm.quantity).toFixed(2)}
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
    <html>
    <head>
      <title>Print Kalika Store Receipt</title>
      <style>
        @page {
          size: 58mm auto;
          margin: 0;
        }
        body {
          width: 52mm;
          margin: 0 auto;
          padding: 4mm 1mm;
          font-family: 'Arial', sans-serif;
          color: #000;
          background-color: #fff;
          -webkit-print-color-adjust: exact;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        tr.header-row th {
          background-color: #000 !important;
          color: #fff !important;
          font-size: 11px;
          font-weight: bold;
          padding: 4px 2px;
          border: none;
        }
      </style>
    </head>
    <body>
      <div class="center">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -1px;">Kalika Store</h1>
        <p style="margin: 3px 0 6px 0; font-size: 9px; font-weight: bold; color: #000; letter-spacing: 0.5px;">—— Thank You! Visit Again ——</p>
      </div>
      
      <div class="divider"></div>
      
      <div style="font-size: 11px; line-height: 1.4; padding: 2px 0;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="font-weight: bold; width: 45%;">Bill No.</td>
            <td style="font-weight: bold; width: 5%;">:</td>
            <td>${billNo}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Date</td>
            <td style="font-weight: bold;">:</td>
            <td>${dateStr}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Time</td>
            <td style="font-weight: bold;">:</td>
            <td>
              <div style="display: flex; justify-content: space-between; width: 100%;">
                <span>${timeStr}</span>
                <span style="font-weight: bold; margin-right: 2px;">Cashier : 01</span>
              </div>
            </td>
          </tr>
        </table>
      </div>
      
      <div class="divider"></div>
      
      <table>
        <thead>
          <tr class="header-row">
            <th style="text-align: left; width: 44%; padding-left: 4px;">Item</th>
            <th style="text-align: center; width: 14%;">Qty</th>
            <th style="text-align: right; width: 21%;">Rate</th>
            <th style="text-align: right; width: 21%; padding-right: 4px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>
      
      <div class="divider"></div>
      
      <div style="font-size: 11px; font-weight: bold; padding: 4px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="text-align: left;">Total Items : ${totalQty}</td>
            <td style="text-align: right;">${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div class="divider"></div>
      
      <div style="font-size: 16px; font-weight: bold; padding: 4px 0;">
        <table style="width: 100%;">
          <tr>
            <td style="text-align: left; font-size: 16px; font-weight: 900;">Grand Total</td>
            <td style="text-align: right; font-size: 16px; font-weight: 900;">₹${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div class="divider"></div>
      
      <div style="font-size: 10px; padding: 3px 0; line-height: 1.3;">
        <table style="width: 100%;">
          <tr>
            <td style="text-align: left; font-weight: bold;">Payment Mode : ${order.paymentMethod || 'Cash'}</td>
            <td style="text-align: right; font-weight: bold;">Paid Amount : ₹${order.total.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="divider"></div>
      
      <div class="center" style="margin-top: 10px; line-height: 1.4;">
        <h2 style="margin: 0; font-size: 16px; font-weight: 900;">Thank You!</h2>
        <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold;">★ Visit Again ★</p>
      </div>
    </body>
    </html>
  `;

  const iframeDoc = iframe.contentWindow || iframe.contentDocument;
  if (iframeDoc) {
    const doc = (iframeDoc as any).document || iframeDoc;
    doc.open();
    doc.write(htmlContent);
    doc.close();
    
    // Stabilize and trigger standard print frame in browser
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 600);
  }
}

/**
 * Web Bluetooth Printer Manager Helper class
 */
export class BluetoothPrinterManager {
  private static activeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private static connectedDevice: BluetoothDevice | null = null;

  static getIsConnected(): boolean {
    return !!this.activeCharacteristic && !!this.connectedDevice?.gatt?.connected;
  }

  static getDeviceName(): string {
    return this.connectedDevice?.name || 'No printer paired';
  }

  static async pairAndConnect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error("Web Bluetooth is not supported on this browser/platform. Try Chrome/Edge or fallback to Browser Silent print!");
      }

      console.log("Requesting Bluetooth Devices with writable characteristic profile, prioritizing target: printer 001...");
      
      // Scans prioritizing generic printer profiles, "printer 001" and common printer service UUIDs
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'printer 001' },
          { namePrefix: 'printer' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'POS' },
          { namePrefix: 'MPT' },
          { namePrefix: 'RPP' },
          { namePrefix: 'XP' },
          { namePrefix: 'BT' }
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ffe0-0000-1000-8000-00805f9b34fb',
          '0000ae30-0000-1000-8000-00805f9b34fb',
          '00001101-0000-1000-8000-00805f9b34fb'
        ]
      }).catch(async (err) => {
        console.warn("Specific filters lookup failed, trying discovery scanner fallback...", err);
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000ffe0-0000-1000-8000-00805f9b34fb',
            '0000ae30-0000-1000-8000-00805f9b34fb',
            '00001101-0000-1000-8000-00805f9b34fb'
          ]
        });
      });

      console.log("Discovered device:", device.name);
      
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Failed to connect to internal GATT server profiles");
      }

      // Query primary services
      const services = await server.getPrimaryServices();
      let writeChar: BluetoothRemoteGATTCharacteristic | null = null;

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        // Look for typical serial/write characteristics
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            writeChar = char;
            break;
          }
        }
        if (writeChar) break;
      }

      if (!writeChar) {
        // Fallback to FFE0 custom module standard if general scanning yielded no standard write hooks
        try {
          const customService = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          writeChar = await customService.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
        } catch (e) {
          console.warn("Direct FFE0 fallback query returned non-working status:", e);
        }
      }

      if (!writeChar) {
        throw new Error("Connected successfully, but absolute writable device characteristic wasn't identified. Check your printer manual.");
      }

      this.connectedDevice = device;
      this.activeCharacteristic = writeChar;

      // Persistence tokens
      localStorage.setItem('paired_bluetooth_device_id', device.id);
      localStorage.setItem('paired_bluetooth_device_name', device.name || 'Thermal printer');
      localStorage.setItem('bluetooth_autoprint_enabled', 'true');

      return true;
    } catch (error: any) {
      console.error("Bluetooth connection handshake failure:", error);
      alert(error?.message || "Bluetooth printer handshake error! Using local iframe fallback.");
      return false;
    }
  }

  static async sendBytesToPrinter(bytes: Uint8Array): Promise<boolean> {
    if (!this.activeCharacteristic) {
      // Try to auto-reconnect if we have a saved ID
      const savedId = localStorage.getItem('paired_bluetooth_device_id');
      if (savedId && navigator.bluetooth?.getDevices) {
        try {
          const devices = await navigator.bluetooth.getDevices();
          const target = devices.find(d => d.id === savedId);
          if (target) {
            const server = await target.gatt?.connect();
            const services = await server?.getPrimaryServices() || [];
            for (const service of services) {
              const characteristics = await service.getCharacteristics();
              for (const char of characteristics) {
                if (char.properties.write || char.properties.writeWithoutResponse) {
                  this.activeCharacteristic = char;
                  this.connectedDevice = target;
                  break;
                }
              }
              if (this.activeCharacteristic) break;
            }
          }
        } catch (reconnectError) {
          console.warn("Auto reconnect failed in background:", reconnectError);
        }
      }
    }

    if (!this.activeCharacteristic) {
      console.warn("No active Bluetooth characteristic linked. Triggering iframe local printed fallback.");
      return false;
    }

    try {
      // Print packages in chunks of 512 bytes for reliable buffer transfers
      const chunkSize = 512;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        if (this.activeCharacteristic.properties.writeWithoutResponse) {
          await this.activeCharacteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.activeCharacteristic.writeValueWithResponse(chunk);
        }
      }
      return true;
    } catch (e) {
      console.error("Transmission stream error:", e);
      return false;
    }
  }

  static disconnect() {
    if (this.connectedDevice?.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
    }
    this.connectedDevice = null;
    this.activeCharacteristic = null;
    localStorage.removeItem('paired_bluetooth_device_id');
    localStorage.removeItem('paired_bluetooth_device_name');
    localStorage.setItem('bluetooth_autoprint_enabled', 'false');
  }
}
