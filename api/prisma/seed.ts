import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TRANSMISSION = ["Manual", "Automatic", "Semi-automatic"];
const FUEL = ["Diesel", "Gasoline", "Electric", "Hybrid"];
const WHEELS = ["4x2", "4x4", "6x2", "6x4", "8x4", "10x4"];

const truckSpecs = [
  { key: "capacityTons", label: "Load capacity", type: "number", unit: "tons" },
  { key: "transmission", label: "Transmission", type: "select", options: TRANSMISSION, filterable: true },
  { key: "fuel", label: "Fuel type", type: "select", options: FUEL, filterable: true },
  { key: "wheelConfig", label: "Wheel configuration", type: "select", options: WHEELS, filterable: true },
  { key: "engine", label: "Engine model", type: "text" },
  { key: "horsepower", label: "Horsepower", type: "number", unit: "hp" },
  { key: "bodyLengthM", label: "Body length", type: "number", unit: "m" },
];
const tractorSpecs = [
  { key: "transmission", label: "Transmission", type: "select", options: TRANSMISSION, filterable: true },
  { key: "fuel", label: "Fuel type", type: "select", options: FUEL, filterable: true },
  { key: "wheelConfig", label: "Wheel configuration", type: "select", options: WHEELS, filterable: true },
  { key: "engine", label: "Engine model", type: "text" },
  { key: "horsepower", label: "Horsepower", type: "number", unit: "hp" },
  { key: "fifthWheel", label: "Fifth wheel", type: "select", options: ["Yes", "No"] },
];
const equipmentSpecs = [
  { key: "operatingHours", label: "Operating hours", type: "number", unit: "hrs" },
  { key: "operatingWeightTons", label: "Operating weight", type: "number", unit: "tons" },
  { key: "engine", label: "Engine model", type: "text" },
  { key: "horsepower", label: "Engine power", type: "number", unit: "hp" },
  { key: "bucketCapacityM3", label: "Bucket capacity", type: "number", unit: "m³" },
];
const craneSpecs = [
  { key: "liftCapacityTons", label: "Lift capacity", type: "number", unit: "tons" },
  { key: "boomLengthM", label: "Boom length", type: "number", unit: "m" },
  { key: "wheelConfig", label: "Wheel configuration", type: "select", options: WHEELS, filterable: true },
  { key: "engine", label: "Engine model", type: "text" },
];
const trailerSpecs = [
  { key: "capacityTons", label: "Load capacity", type: "number", unit: "tons" },
  { key: "axles", label: "Axles", type: "select", options: ["1", "2", "3", "4"], filterable: true },
  { key: "lengthM", label: "Length", type: "number", unit: "m" },
];
const generic = [
  { key: "engine", label: "Engine / model", type: "text" },
  { key: "capacityTons", label: "Capacity", type: "number", unit: "tons" },
];

// NOTE: category list beyond the 7 named in the brief is a placeholder — the client confirms the final 26.
const categories: [string, any[]][] = [
  ["Dump Trucks", truckSpecs],
  ["Wing Vans", truckSpecs],
  ["Boom Trucks", craneSpecs],
  ["Closed Vans", truckSpecs],
  ["Dropsides", truckSpecs],
  ["Tractor Heads", tractorSpecs],
  ["Excavators", equipmentSpecs],
  ["Flatbed Trucks", truckSpecs],
  ["Refrigerated Vans", truckSpecs],
  ["Tanker Trucks", truckSpecs],
  ["Mixer Trucks", truckSpecs],
  ["Garbage Trucks", truckSpecs],
  ["Tow Trucks", truckSpecs],
  ["Water Trucks", truckSpecs],
  ["Fire Trucks", truckSpecs],
  ["Pickup & Light Trucks", truckSpecs],
  ["Wheel Loaders", equipmentSpecs],
  ["Backhoe Loaders", equipmentSpecs],
  ["Bulldozers", equipmentSpecs],
  ["Motor Graders", equipmentSpecs],
  ["Road Rollers", equipmentSpecs],
  ["Skid Steer Loaders", equipmentSpecs],
  ["Mobile Cranes", craneSpecs],
  ["Forklifts", equipmentSpecs],
  ["Trailers", trailerSpecs],
  ["Other Equipment", generic],
];

const brands = [
  "Isuzu", "Hino", "Mitsubishi Fuso", "UD Trucks", "Fuso", "Mercedes-Benz", "Volvo", "Scania", "MAN", "Howo",
  "Sinotruk", "Shacman", "FAW", "Foton", "Dongfeng", "Hyundai", "Daewoo", "Kobelco", "Komatsu", "Caterpillar",
  "Hitachi", "Kubota", "Sumitomo", "Doosan", "Tadano", "Kato", "JCB", "Toyota", "Nissan",
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  for (const [i, [name, specSchema]] of categories.entries()) {
    await prisma.category.upsert({
      where: { slug: slug(name) },
      update: { name, sortOrder: i, specSchema },
      create: { slug: slug(name), name, sortOrder: i, specSchema },
    });
  }
  for (const name of brands) {
    await prisma.brand.upsert({ where: { slug: slug(name) }, update: { name }, create: { slug: slug(name), name } });
  }
  const email = (process.env.ADMIN_EMAIL || "admin@truckmarket.ph").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "Admin", role: "ADMIN", passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, admin ${email}`);
}

main().finally(() => prisma.$disconnect());
