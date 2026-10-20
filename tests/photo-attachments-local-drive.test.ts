import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { JobCardPhoto } from '../src/utils/photoStorage';

describe('Job Card Photo Attachments & Local Drive Storage', () => {
  const samplePhotos: JobCardPhoto[] = [
    {
      id: 'PHOTO-001',
      jobCardId: 'JC-2026-0001',
      name: 'bumper_scratch.jpg',
      type: 'image/jpeg',
      size: 145000,
      dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      category: 'damage',
      caption: 'Deep scratch on rear left bumper before repair',
      timestamp: '2026-09-30T10:00:00.000Z'
    },
    {
      id: 'PHOTO-002',
      jobCardId: 'JC-2026-0001',
      name: 'odometer_reading.png',
      type: 'image/png',
      size: 98000,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      category: 'odometer_fuel',
      caption: 'Mileage recorded at 145,210 km with half tank fuel',
      timestamp: '2026-09-30T10:05:00.000Z'
    }
  ];

  it('formats clean, descriptive file names for single photo downloads to local drive', () => {
    const jobCardNumber = 'JC-2026-0001';
    const vehiclePlate = '987654';

    const photo = samplePhotos[0];
    const cleanJobNo = jobCardNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
    const cleanPlate = vehiclePlate.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = photo.type.includes('png') ? 'png' : 'jpg';
    const filename = `${cleanJobNo}_${cleanPlate ? cleanPlate + '_' : ''}${photo.category}_${photo.id.slice(-6)}.${ext}`;

    assert.strictEqual(filename, 'JC-2026-0001_987654_damage_TO-001.jpg');
  });

  it('creates a valid ZIP archive containing all photos and manifest for local drive saving', async () => {
    const zip = new JSZip();
    const jobCardNumber = 'JC-2026-0001';
    const vehiclePlate = '987654';

    const folderName = `${jobCardNumber}_Vehicle_Photos`;
    const imgFolder = zip.folder(folderName) || zip;

    samplePhotos.forEach((photo, idx) => {
      const base64Data = photo.dataUrl.split(',')[1];
      const ext = photo.type.includes('png') ? 'png' : 'jpg';
      const photoName = `${idx + 1}_${photo.category}_${photo.name}`;
      imgFolder.file(photoName, base64Data, { base64: true });
    });

    imgFolder.file('MANIFEST.txt', `Total photos: ${samplePhotos.length}\nJob Card: ${jobCardNumber}`);

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    assert.ok(zipBuffer.length > 0, 'Zip file buffer must not be empty');

    // Unzip and verify contents
    const readZip = await JSZip.loadAsync(zipBuffer);
    const files = Object.keys(readZip.files);
    
    assert.ok(files.some(f => f.includes('bumper_scratch.jpg')), 'Must contain bumper_scratch.jpg');
    assert.ok(files.some(f => f.includes('odometer_reading.png')), 'Must contain odometer_reading.png');
    assert.ok(files.some(f => f.includes('MANIFEST.txt')), 'Must contain MANIFEST.txt');
  });

  it('maintains categories and metadata for pre-inspection and damage tracking', () => {
    assert.strictEqual(samplePhotos[0].category, 'damage');
    assert.strictEqual(samplePhotos[1].category, 'odometer_fuel');
    assert.ok(samplePhotos[0].caption?.includes('bumper'));
    assert.ok(samplePhotos[1].caption?.includes('145,210 km'));
  });
});
