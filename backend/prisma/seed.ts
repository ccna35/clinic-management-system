import bcrypt from "bcrypt";
import { AppointmentStatus, Gender, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const doctorsSeed = [
    { name: "Dr. Ahmed Hassan", specialty: "Cardiology", phone: "01010000001", email: "ahmed.hassan@clinic.com" },
    { name: "Dr. Mona Adel", specialty: "Dermatology", phone: "01010000002", email: "mona.adel@clinic.com" },
    { name: "Dr. Karim Samir", specialty: "Pediatrics", phone: "01010000003", email: "karim.samir@clinic.com" },
    { name: "Dr. Youssef Nabil", specialty: "Orthopedics", phone: "01010000004", email: "youssef.nabil@clinic.com" },
    { name: "Dr. Salma Fathy", specialty: "ENT", phone: "01010000005", email: "salma.fathy@clinic.com" }
];

const patientsSeed = [
    { name: "Mohamed Ali", phone: "01120000001", age: 31, gender: Gender.MALE, notes: "Follow-up" },
    { name: "Ahmed Mostafa", phone: "01120000002", age: 27, gender: Gender.MALE, notes: "Blood pressure checks" },
    { name: "Mona Hassan", phone: "01120000003", age: 24, gender: Gender.FEMALE, notes: "Skin rash" },
    { name: "Sara Adel", phone: "01120000004", age: 29, gender: Gender.FEMALE, notes: "Routine consultation" },
    { name: "Karim Youssef", phone: "01120000005", age: 34, gender: Gender.MALE, notes: "Back pain" },
    { name: "Nour Mohamed", phone: "01120000006", age: 21, gender: Gender.FEMALE, notes: "General checkup" },
    { name: "Omar Samir", phone: "01120000007", age: 36, gender: Gender.MALE, notes: "Orthopedic complaint" },
    { name: "Laila Mahmoud", phone: "01120000008", age: 42, gender: Gender.FEMALE, notes: "Eye examination" }
];

async function main(): Promise<void> {
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();

    const passwordHash = await bcrypt.hash("password123", 10);

    await prisma.user.upsert({
        where: { email: "reception@clinic.com" },
        update: {
            name: "Reception Demo",
            password: passwordHash,
            role: Role.RECEPTIONIST
        },
        create: {
            name: "Reception Demo",
            email: "reception@clinic.com",
            password: passwordHash,
            role: Role.RECEPTIONIST
        }
    });

    for (const doctor of doctorsSeed) {
        await prisma.doctor.upsert({
            where: { email: doctor.email },
            update: doctor,
            create: doctor
        });
    }

    const patientRecords = [] as { id: string }[];

    for (const patient of patientsSeed) {
        const created = await prisma.patient.create({ data: patient });
        patientRecords.push({ id: created.id });
    }

    const doctors = await prisma.doctor.findMany({ where: { isActive: true } });

    if (!doctors.length || !patientRecords.length) {
        return;
    }

    const now = new Date();

    for (let i = 0; i < 15; i += 1) {
        const doctor = doctors[i % doctors.length];
        const patient = patientRecords[i % patientRecords.length];
        const date = new Date(now);
        date.setHours(9 + (i % 8), (i % 2) * 30, 0, 0);
        date.setDate(now.getDate() + Math.floor(i / 6));

        const statusValues = [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.WAITING,
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED
        ];

        await prisma.appointment.create({
            data: {
                patientId: patient.id,
                doctorId: doctor.id,
                date,
                reason: "General consultation",
                status: statusValues[i % statusValues.length]
            }
        });
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        await prisma.$disconnect();
        process.exit(1);
    });
