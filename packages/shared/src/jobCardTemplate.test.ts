import { generateJobCardHtml, JobCardData } from './jobCardTemplate';

describe('Job Card HTML Generation Engine (@repairshop/shared/jobCardTemplate.ts)', () => {
  const sampleJobCardData: JobCardData = {
    jobCode: 'DS-2026-0042',
    createdAt: '2026-09-17T10:30:00.000Z',
    jobType: 'Inhouse',
    priority: 'Urgent',
    status: 'Received',
    serviceTitle: 'Chip-level Motherboard Repair',
    intakeStaffName: 'Rahul Sharma',
    technicianName: 'Bikash Das',

    customerName: 'Amit Kumar Roy',
    customerContact: '+91 9876543210',
    customerEmail: 'amit.roy@example.com',
    customerAddress: 'Tarani Road, Silchar, Assam - 788005',
    customerGstin: '18AABCU9603R1ZM',

    deviceType: 'Laptop',
    serialNumber: 'NXA4ESI0019283',
    reportedIssue: 'Device does not turn on. Power LED blinks twice then goes dark.',
    remarks: 'Scratches on top cover. Original 65W charger and laptop bag received.',
    workNotes: 'Initial check indicates short circuit on primary 19V power rail.',

    materials: [
      { name: 'DC Power Jack Cable', quantity: 1 },
      { name: 'Thermal Compound 1.5g', quantity: 2 },
    ],
  };

  it('generates valid HTML containing all critical operational metadata', () => {
    const html = generateJobCardHtml(sampleJobCardData);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('DS-2026-0042');
    expect(html).toContain('JOB CARD / INTAKE');
    expect(html).toContain('Amit Kumar Roy');
    expect(html).toContain('+91 9876543210');
    expect(html).toContain('amit.roy@example.com');
    expect(html).toContain('Tarani Road, Silchar, Assam - 788005');
    expect(html).toContain('18AABCU9603R1ZM');
    expect(html).toContain('Laptop');
    expect(html).not.toContain('NXA4ESI0019283');
    expect(html).not.toContain('Serial / IMEI / Tag');
    expect(html).toContain('Device does not turn on. Power LED blinks twice then goes dark.');
    expect(html).toContain('Scratches on top cover. Original 65W charger and laptop bag received.');
    expect(html).toContain('Chip-level Motherboard Repair');
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('Bikash Das');
  });

  it('strictly excludes any financial/pricing information', () => {
    const html = generateJobCardHtml(sampleJobCardData);

    // No currency symbol
    expect(html).not.toContain('₹');
    // No billing keywords
    expect(html).not.toMatch(/Grand Total/i);
    expect(html).not.toMatch(/Subtotal/i);
    expect(html).not.toMatch(/Labour Charge/i);
    expect(html).not.toMatch(/Tax Amount/i);
    expect(html).not.toMatch(/Total Tax/i);
    expect(html).not.toMatch(/Discount Amount/i);
    expect(html).not.toMatch(/Balance Due/i);
  });

  it('renders technical parts by description and quantity only, without price columns', () => {
    const html = generateJobCardHtml(sampleJobCardData);

    expect(html).toContain('DC Power Jack Cable');
    expect(html).toContain('Thermal Compound 1.5g');
    expect(html).toContain('Qty');
    expect(html).not.toContain('Unit Price');
    expect(html).not.toContain('Total Cost');
    expect(html).not.toContain('Selling Rate');
  });

  it('includes terms of service and signature acknowledgment blocks', () => {
    const html = generateJobCardHtml(sampleJobCardData);

    expect(html).toContain('Customer Intake Acknowledgement & Terms');
    expect(html).toContain('Customer Signature');
    expect(html).toContain('Authorized Workshop Signature');
    expect(html).toContain('Data Backup');
  });

  it('properly escapes HTML to prevent tag injection', () => {
    const maliciousData: JobCardData = {
      ...sampleJobCardData,
      customerName: '<script>alert("hacked")</script>',
      reportedIssue: 'Cracked screen & LCD <damage>',
    };

    const html = generateJobCardHtml(maliciousData);

    expect(html).not.toContain('<script>alert("hacked")</script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;hacked&quot;)&lt;/script&gt;');
    expect(html).toContain('&amp; LCD &lt;damage&gt;');
  });
});
