import { describe, expect, it } from 'vitest';
import { parseVehicleText } from './parseVehicleText';

describe('parseVehicleText', () => {
  it('reads a labelled listing', () => {
    const { values } = parseVehicleText(`2018 Toyota Camry SE
Price: GH₵ 250,000
Mileage: 45,000 km
Engine: 2.5L 4-cylinder
Fuel: Petrol
Transmission: Automatic
Colour: Black
Interior: Beige leather
Condition: Foreign used
Location: Accra, Spintex
Features: Reverse camera, Sunroof, Leather seats, Bluetooth`);

    expect(values).toMatchObject({
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      year: '2018',
      price: '250000',
      currency: 'GHS',
      mileage: '45000',
      mileageUnit: 'km',
      engineSize: '2.5L 4-cylinder',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      exteriorColor: 'Black',
      interiorColor: 'Beige leather',
      condition: 'Foreign used',
      location: 'Accra, Spintex',
    });
    expect(values.featuresText?.split('\n')).toEqual(['Reverse camera', 'Sunroof', 'Leather seats', 'Bluetooth']);
  });

  it('reads a WhatsApp-style post without labels', () => {
    const { values } = parseVehicleText(`🔥🔥 NEW ARRIVAL 🔥🔥
Honda CR-V EX 2019 ✅
Foreign used (USA) • Automatic • AWD
2.4L petrol, 62k miles
Black exterior with black leather interior
✔️ Sunroof
✔️ Reverse camera
✔️ Push to start
Accident free, duty paid
Price: $18,500
Call/WhatsApp 0556062526`);

    expect(values).toMatchObject({
      make: 'Honda',
      model: 'CR-V',
      trim: 'EX',
      year: '2019',
      price: '18500',
      currency: 'USD',
      mileage: '62000',
      mileageUnit: 'mi',
      engineSize: '2.4L',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      drivetrain: 'All-wheel drive',
      exteriorColor: 'Black',
      interiorColor: 'Black',
      condition: 'Foreign used',
    });
    expect(values.featuresText?.split('\n')).toEqual(['Sunroof', 'Reverse camera', 'Push to start']);
    expect(values.conditionNotes).toContain('Accident free');
    expect(values.description).toBeUndefined();
    expect(JSON.stringify(values)).not.toContain('0556062526');
  });

  it('understands Ghana pricing shorthand and multi-word makes and models', () => {
    const { values } = parseVehicleText(`Range Rover Sport HSE 2020
Ghanaian used, diesel, 4x4
Price 1.2m cedis
Located in Kumasi.`);

    expect(values).toMatchObject({
      make: 'Land Rover',
      model: 'Range Rover',
      trim: 'Sport HSE',
      year: '2020',
      price: '1200000',
      currency: 'GHS',
      condition: 'Locally used',
      fuelType: 'Diesel',
      drivetrain: 'Four-wheel drive',
      location: 'Kumasi',
    });
  });

  it('keeps wording that is not in the lists so staff can review it', () => {
    const { values } = parseVehicleText(`Make: Toyota
Model: Land Cruiser
Year: 2016
Body type: Limousine
Gearbox: Semi-automatic
Condition: Excellent, no scratches`);

    expect(values).toMatchObject({ make: 'Toyota', model: 'Land Cruiser', year: '2016', bodyType: 'Limousine', transmission: 'Semi-Automatic' });
    expect(values.condition).toBeUndefined();
    expect(values.conditionNotes).toBe('Excellent, no scratches');
  });

  it('puts sentences in the description and never invents missing details', () => {
    const { values } = parseVehicleText(`Toyota Corolla
This car has been well maintained and drives very smoothly on all roads.`);

    expect(values.make).toBe('Toyota');
    expect(values.model).toBe('Corolla');
    expect(values.description).toBe('This car has been well maintained and drives very smoothly on all roads.');
    expect(values.year).toBeUndefined();
    expect(values.price).toBeUndefined();
    expect(values.mileage).toBeUndefined();
  });
});
