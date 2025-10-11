const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('❌ serviceAccountKey.json not found. Place it in the project root.', error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
console.log(`ℹ️  Connected to Firestore project: ${admin.app().options?.credential?.projectId || serviceAccount.project_id}`);
const USERS_COLLECTION = 'users';
const BUSES_COLLECTION = 'buses';
const CSV_FILENAME = 'BUS details(BUS 21).csv';
const CSV_PATH = path.join(__dirname, '..', 'Bus_data', CSV_FILENAME);

const normalizeBus = (value) => {
  if (!value) return '';
  return value.toString().toUpperCase().replace(/\s+/g, '').replace(/-+/g, '-').trim();
};

const parseCsvFile = () => {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found at ${CSV_PATH}`);
  }

  const rawContent = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = rawContent.split(/\r?\n/).map((line) => line.replace(/\r/g, ''));

  if (!lines.length) {
    throw new Error('CSV file is empty.');
  }

  const busInfoLine = lines[0]?.split(',')[0] || '';
  const [, busDisplayNumber = ''] = busInfoLine.split(':');
  const trimmedBusDisplay = busDisplayNumber.trim();
  const busNumber = normalizeBus(trimmedBusDisplay);

  const students = [];
  const staff = {
    driver: null,
    coadmin: null,
  };

  let section = 'students';

  for (let index = 2; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }

    const cells = line.split(',').map((cell) => cell.trim());
    const indicator = (cells[2] || '').toLowerCase();

    if (indicator.includes('driver login')) {
      section = 'driver';
      continue;
    }

    if (indicator.includes('coadmin login')) {
      section = 'coadmin';
      continue;
    }

    if (section === 'students') {
      const registerNumber = (cells[1] || '').trim();
      if (!registerNumber) {
        continue;
      }

      const name = cells[2] || '';
      const yearDept = (cells[3] || '').split('/');
      const year = (yearDept[0] || '').trim();
      const department = (yearDept[1] || '').trim();
      const boardingPoint = cells[4] || '';
      const remarks = cells[5] || '';

      students.push({
        registerNumber,
        name,
        year,
        department,
        boardingPoint,
        remarks,
      });
      continue;
    }

    if (section === 'driver' && indicator.startsWith('userid')) {
      const [, userIdValue = ''] = cells[2].split(':');
      staff.driver = {
        userId: userIdValue.trim(),
        password: '',
      };
      continue;
    }

    if (section === 'driver' && indicator.startsWith('password')) {
      if (staff.driver) {
        const [, passwordValue = ''] = cells[2].split(':');
        staff.driver.password = passwordValue.trim();
      }
      continue;
    }

    if (section === 'coadmin' && indicator.startsWith('userid')) {
      const [, userIdValue = ''] = cells[2].split(':');
      staff.coadmin = {
        userId: userIdValue.trim(),
        password: '',
      };
      continue;
    }

    if (section === 'coadmin' && indicator.startsWith('pasword')) {
      if (staff.coadmin) {
        const [, passwordValue = ''] = cells[2].split(':');
        staff.coadmin.password = passwordValue.trim();
      }
      continue;
    }
  }

  return {
    busDisplayNumber: trimmedBusDisplay,
    busNumber,
    students,
    staff,
  };
};

const storeBusData = async ({ busNumber, busDisplayNumber, students, staff }) => {
  if (!busNumber) {
    throw new Error('Bus number missing in CSV.');
  }

  const busDocRef = db.collection(BUSES_COLLECTION).doc(busNumber);
  const usersCollectionRef = db.collection(USERS_COLLECTION);

  const timestamp = new Date().toISOString();

  const uniqueStops = [];
  students.forEach((student) => {
    const stop = (student.boardingPoint || '').trim();
    if (stop && !uniqueStops.includes(stop)) {
      uniqueStops.push(stop);
    }
  });

  const busDocData = {
    busNumber,
    displayName: busDisplayNumber,
    updatedAt: timestamp,
    studentCount: students.length,
    studentsCount: students.length,
    routeStops: uniqueStops,
  };

  await busDocRef.set(busDocData, { merge: true });

  const batch = db.batch();

  students.forEach((student, index) => {
    const { registerNumber, name, year, department, boardingPoint, remarks } = student;
    if (!registerNumber) {
      return;
    }

    const userDocRef = usersCollectionRef.doc(registerNumber);
    batch.set(
      userDocRef,
      {
        userId: registerNumber,
        registerNumber,
        name,
        role: 'student',
        password: name,
        busNumber,
        busDisplayName: busDisplayNumber,
        year,
        department,
        boardingPoint,
        remarks,
        status: 'Active',
        authenticated: true,
        registeredAt: timestamp,
        order: index + 1,
      },
      { merge: true }
    );

    const studentDocRef = busDocRef.collection('students').doc(registerNumber);
    batch.set(
      studentDocRef,
      {
        registerNumber,
        name,
        year,
        department,
        boardingPoint,
        remarks,
        password: name,
        status: 'Active',
        updatedAt: timestamp,
        order: index + 1,
      },
      { merge: true }
    );
  });

  if (staff.driver?.userId && staff.driver?.password) {
    const driverId = staff.driver.userId.trim();
    const driverPassword = staff.driver.password.trim();

    const driverDocRef = usersCollectionRef.doc(driverId);
    batch.set(
      driverDocRef,
      {
        userId: driverId,
        role: 'driver',
        password: driverPassword,
        busNumber,
        busDisplayName: busDisplayNumber,
        status: 'Active',
        authenticated: true,
        registeredAt: timestamp,
      },
      { merge: true }
    );

    const busDriverRef = busDocRef.collection('staff').doc('driver');
    batch.set(
      busDriverRef,
      {
        userId: driverId,
        role: 'driver',
        password: driverPassword,
        updatedAt: timestamp,
      },
      { merge: true }
    );
  }

  if (staff.coadmin?.userId && staff.coadmin?.password) {
    const coadminId = staff.coadmin.userId.trim();
    const coadminPassword = staff.coadmin.password.trim();

    const coadminDocRef = usersCollectionRef.doc(coadminId);
    batch.set(
      coadminDocRef,
      {
        userId: coadminId,
        role: 'coadmin',
        password: coadminPassword,
        busNumber,
        busDisplayName: busDisplayNumber,
        status: 'Active',
        authenticated: true,
        registeredAt: timestamp,
      },
      { merge: true }
    );

    const busCoadminRef = busDocRef.collection('staff').doc('coadmin');
    batch.set(
      busCoadminRef,
      {
        userId: coadminId,
        role: 'coadmin',
        password: coadminPassword,
        updatedAt: timestamp,
      },
      { merge: true }
    );
  }

  await batch.commit();

  return {
    busNumber,
    studentCount: students.length,
    hasDriver: Boolean(staff.driver?.userId && staff.driver?.password),
    hasCoadmin: Boolean(staff.coadmin?.userId && staff.coadmin?.password),
  };
};

(async () => {
  try {
    const csvData = parseCsvFile();
    const result = await storeBusData(csvData);
    console.log(`✅ Imported data for bus ${result.busNumber}. Students: ${result.studentCount}. Driver: ${result.hasDriver}. CoAdmin: ${result.hasCoadmin}.`);

    const sampleUsers = await db
      .collection(USERS_COLLECTION)
      .where('busNumber', '==', csvData.busNumber)
      .limit(5)
      .get();

    console.log('ℹ️  Sample users (userId -> role):', sampleUsers.docs.map((doc) => `${doc.id} -> ${doc.data().role}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error.message || error);
    process.exit(1);
  }
})();
