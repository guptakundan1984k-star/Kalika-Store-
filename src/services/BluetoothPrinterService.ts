
/**
 * Service to handle Bluetooth Thermal Printer (ESC/POS)
 * Targeted for 2-inch (58mm) printers.
 */

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  // ESC/POS Commands
  private readonly ESC = 0x1B;
  private readonly GS = 0x1D;
  private readonly LF = 0x0A;

  isBluetoothSupported() {
    return !!navigator.bluetooth;
  }

  isIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  async connect() {
    if (this.isIframe()) {
      throw new Error('Bluetooth API is restricted in iframes. Please open the app in a new tab using the square arrow icon at the top right.');
    }

    if (!this.isBluetoothSupported()) {
      throw new Error('Bluetooth is not supported in this browser. Please use Chrome or Edge.');
    }

    try {
      // Common Bluetooth Printer UUIDs
      const PRINTER_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb', // Additional common printer UUID
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '00001101-0000-1000-8000-00805f9b34fb' // Serial Port Profile
      ];

      console.log("[Printer Connect] Scanning devices, prioritizing Name target: printer 001...");
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'printer 001' },
          { namePrefix: 'printer' },
          { namePrefix: 'POS' },
          { namePrefix: 'Thermal' },
          { namePrefix: 'MPT' },
          { namePrefix: 'XP' },
          { namePrefix: 'BT' }
        ],
        optionalServices: PRINTER_SERVICES
      }).catch(async (err) => {
        console.warn("[Printer Connect] Specific filters failed, scanning all devices...", err);
        return await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: PRINTER_SERVICES
        });
      });

      if (!this.device) throw new Error('No device selected');

      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');

      const services = await server.getPrimaryServices();
      
      if (!services || services.length === 0) {
        throw new Error('No services found on device. Ensure it is a thermal printer.');
      }

      // Try to find a writable characteristic
      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              break;
            }
          }
        } catch (e) {
          console.warn('Failed to get characteristics for service:', service.uuid);
        }
        if (this.characteristic) break;
      }

      if (!this.characteristic) {
        // Last ditch effort: try common service UUID directly if primary services lookup failed to find writable char
        for (const serviceUuid of PRINTER_SERVICES) {
          try {
            const service = await server.getPrimaryService(serviceUuid);
            const characteristics = await service.getCharacteristics();
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                this.characteristic = char;
                break;
              }
            }
          } catch (e) {}
          if (this.characteristic) break;
        }
      }

      if (!this.characteristic) throw new Error('No writable characteristic found. This device might not support standard ESC/POS printing over Bluetooth.');
      
      console.log('Successfully connected to printer:', this.device.name);
      
      // Save for auto-reconnection
      localStorage.setItem('paired_bluetooth_device_id', this.device.id);
      localStorage.setItem('paired_bluetooth_device_name', this.device.name || 'printer 001');
      localStorage.setItem('bluetooth_autoprint_enabled', 'true');
      
      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  async print(data: Uint8Array) {
    if (!this.characteristic) {
      // Auto reconnect helper
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
                  this.characteristic = char;
                  this.device = target;
                  break;
                }
              }
              if (this.characteristic) break;
            }
          }
        } catch (reconnectErr) {
          console.warn("[Auto-connect] Failed background link reconnect:", reconnectErr);
        }
      }
    }

    if (!this.characteristic) throw new Error('Printer not connected');
    
    // Split data into chunks (Bluetooth characteristic write limit is usually 20-512 bytes)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (this.characteristic.properties.writeWithoutResponse) {
        await this.characteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.characteristic.writeValue(chunk);
      }
    }
  }

  async printOrder(order: any, storeName: string = "Kalika Store") {
    const encoder = new TextEncoder();
    const commands: number[] = [];

    // Helper function to send formatted line segments matching our ESC/POS encoder
    const writeText = (text: string) => {
      commands.push(...Array.from(encoder.encode(text)));
    };

    // 1. Initialize Printer
    commands.push(this.ESC, 0x40);

    // 2. Beautiful Store Heading (Kalika Store) - Center, Double size, Bold
    commands.push(this.ESC, 0x61, 0x01); // Center Align
    commands.push(this.GS, 0x21, 0x11); // Double width + height (3x larger)
    commands.push(this.ESC, 0x45, 0x01); // Bold on
    writeText(storeName + "\n");

    // 3. Reset Text size, Keep bold for horizontal subtitle flanked line
    commands.push(this.GS, 0x21, 0x00); // Reset scale
    commands.push(this.ESC, 0x45, 0x01); // Bold on
    writeText("-- Thank You! Visit Again --\n");
    commands.push(this.ESC, 0x45, 0x00); // Bold off

    // 4. Double Separator
    writeText("--------------------------------\n");

    // 5. Left Align Order details
    commands.push(this.ESC, 0x61, 0x00); // Left align

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

    // "Item            Qty  Rate Amount" column bar
    writeText("Item            Qty  Rate Amount\n");
    writeText("--------------------------------\n");

    // 7. Render dynamic item rows with line wrapping
    let totalQty = 0;
    order.items.forEach((itm: any) => {
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
      
      words.forEach((word: string) => {
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
    commands.push(this.ESC, 0x45, 0x01); // Bold on
    
    const grandLabel = "Grand Total"; // 11 chars
    const grandValue = `Rs.${Number(order.total || 0).toFixed(2)}`; // e.g. "Rs.200.00" -> 9 chars
    const grandSpacing = Math.max(0, 32 - grandLabel.length - grandValue.length);
    writeText(`${grandLabel}${"".padStart(grandSpacing, " ")}${grandValue}\n`);
    
    commands.push(this.ESC, 0x45, 0x00); // Bold off

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
    commands.push(this.ESC, 0x61, 0x01); // Center Align
    commands.push(this.GS, 0x21, 0x11); // Double Size for Thank You!
    commands.push(this.ESC, 0x45, 0x01); // Bold on
    writeText("Thank You!\n");

    commands.push(this.GS, 0x21, 0x00); // Reset scale
    writeText("* Visit Again *\n");
    commands.push(this.ESC, 0x45, 0x00); // Bold off

    // 12. Spacing / Feeds & Cut command
    commands.push(this.LF, this.LF, this.LF, this.LF);
    
    await this.print(new Uint8Array(commands));
  }

  isConnected() {
    return !!this.characteristic;
  }

  async disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }
}

export const printerService = new BluetoothPrinterService();
