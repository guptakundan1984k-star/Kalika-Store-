
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

      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES
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
      return true;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw error;
    }
  }

  async print(data: Uint8Array) {
    if (!this.characteristic) throw new Error('Printer not connected');
    
    // Split data into chunks (Bluetooth characteristic write limit is usually 20-512 bytes)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
    }
  }

  async printOrder(order: any, storeName: string = "KALIKA STORE") {
    const encoder = new TextEncoder();
    const commands: number[] = [];

    // Initialize
    commands.push(this.ESC, 0x40);

    // Center Align & Bold Store Name
    commands.push(this.ESC, 0x61, 0x01); // Center
    commands.push(this.ESC, 0x45, 0x01); // Bold
    commands.push(...Array.from(encoder.encode(storeName + "\n")));
    commands.push(this.ESC, 0x45, 0x00); // Bold off
    
    // Address/Info
    commands.push(...Array.from(encoder.encode("Opp. Krishi Bazaar, Ranchi\n")));
    commands.push(...Array.from(encoder.encode("Beside Bank Of India\n")));
    commands.push(...Array.from(encoder.encode("Mob: +91 9608123427\n")));
    commands.push(...Array.from(encoder.encode("--------------------------------\n"))); // 32 chars for 2-inch

    // Order Info
    commands.push(this.ESC, 0x61, 0x00); // Left align
    commands.push(...Array.from(encoder.encode(`Order: #${order.id.slice(-6).toUpperCase()}\n`)));
    commands.push(...Array.from(encoder.encode(`Date: ${new Date(order.createdAt).toLocaleDateString()}\n`)));
    commands.push(...Array.from(encoder.encode(`Cust: ${order.userId.slice(0, 10)}...\n`)));
    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Items Header
    commands.push(...Array.from(encoder.encode("Item            Qty    Price\n")));
    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Items
    order.items.forEach((item: any) => {
      const name = item.name.substring(0, 15).padEnd(16);
      const qty = item.quantity.toString().padStart(3);
      const price = (item.price * item.quantity).toString().padStart(8);
      commands.push(...Array.from(encoder.encode(`${name}${qty}${price}\n`)));
    });

    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Totals
    commands.push(this.ESC, 0x61, 0x02); // Right align
    commands.push(...Array.from(encoder.encode(`Subtotal: Rs.${order.total}\n`)));
    commands.push(...Array.from(encoder.encode(`Delivery: Rs.0\n`)));
    commands.push(this.ESC, 0x45, 0x01); // Bold
    commands.push(...Array.from(encoder.encode(`TOTAL: Rs.${order.total}\n`)));
    commands.push(this.ESC, 0x45, 0x00); // Bold off

    // Footer
    commands.push(this.ESC, 0x61, 0x01); // Center
    commands.push(this.LF);
    commands.push(...Array.from(encoder.encode("Thank you for shopping!\n")));
    commands.push(...Array.from(encoder.encode("Visit again!\n")));
    
    // Feed and cut
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
