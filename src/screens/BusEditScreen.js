import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../utils/constants';
import { db } from '../services/firebaseConfig';
import { normalizeBusNumber } from '../services/locationService';
import { registeredUsersStorage } from '../services/registeredUsersStorage';

const DEFAULT_STUDENT_FORM = {
  registerNumber: '',
  name: '',
  year: '',
  department: '',
  boardingPoint: '',
  password: '',
};

const DEFAULT_DRIVER_FORM = {
  userId: '',
  password: '',
  name: '',
  phone: '',
};

const DEFAULT_COADMIN_FORM = {
  userId: '',
  password: '',
  name: '',
  phone: '',
};

const BusEditScreen = ({ navigation, route }) => {
  const { busId: rawBusId, role: routeRole = 'management' } = route.params || {};
  const resolvedBusNumber = normalizeBusNumber(rawBusId);

  const isCoAdmin = routeRole === 'coadmin';

  const [busNumberInput, setBusNumberInput] = useState(resolvedBusNumber);
  const [displayNameInput, setDisplayNameInput] = useState(rawBusId || resolvedBusNumber);
  const [currentBusId, setCurrentBusId] = useState(resolvedBusNumber);
  const [students, setStudents] = useState([]);
  const [driver, setDriver] = useState(null);
  const [coAdmins, setCoAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [studentForm, setStudentForm] = useState(DEFAULT_STUDENT_FORM);
  const [driverForm, setDriverForm] = useState(DEFAULT_DRIVER_FORM);
  const [coAdminForm, setCoAdminForm] = useState(DEFAULT_COADMIN_FORM);

  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showDriverForm, setShowDriverForm] = useState(false);
  const [showCoAdminForm, setShowCoAdminForm] = useState(false);

  const loadBusData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const normalized = currentBusId;
      const busSnapshot = await getDoc(doc(db, 'buses', normalized));
      if (busSnapshot.exists()) {
        const data = busSnapshot.data();
        setBusNumberInput(data.busNumber || normalized);
        setDisplayNameInput(data.displayName || data.busNumber || normalized);
      } else {
        setBusNumberInput(normalized);
        setDisplayNameInput(normalized);
      }

      const allStudents = await registeredUsersStorage.getAllStudents({ forceRefresh: true });
      const filteredStudents = allStudents.filter(
        (student) => normalizeBusNumber(student.busNumber) === normalized
      );
      setStudents(filteredStudents);

      const allDrivers = await registeredUsersStorage.getAllDrivers();
      const associatedDriver = allDrivers.find(
        (item) => normalizeBusNumber(item.busNumber) === normalized
      );
      setDriver(associatedDriver || null);

      const allCoAdmins = await registeredUsersStorage.getAllCoAdmins();
      const associatedCoAdmins = allCoAdmins.filter(
        (item) => normalizeBusNumber(item.busNumber) === normalized
      );
      setCoAdmins(associatedCoAdmins);
    } catch (err) {
      console.error('❌ [BUS EDIT] Failed to load bus data:', err);
      setError('Unable to load bus details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentBusId]);

  useEffect(() => {
    loadBusData();
  }, [loadBusData]);

  const updateBusCounts = useCallback(async (targetBusId, studentTotal) => {
    try {
      await updateDoc(doc(db, 'buses', targetBusId), {
        studentsCount: studentTotal,
        studentCount: studentTotal,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('⚠️ [BUS EDIT] Unable to update bus counts:', err.message);
    }
  }, []);

  const handleStudentRemoval = useCallback(
    (student) => {
      Alert.alert(
        'Remove Student',
        `Are you sure you want to remove ${student.name || student.registerNumber} from ${currentBusId}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                setSaving(true);
                await deleteDoc(doc(db, 'users', student.id));
                await deleteDoc(doc(db, 'buses', currentBusId, 'students', student.id));
                registeredUsersStorage.invalidateStudentCache();
                await loadBusData();
                await updateBusCounts(currentBusId, students.filter((s) => s.id !== student.id).length);
              } catch (err) {
                console.error('❌ [BUS EDIT] Failed to remove student:', err);
                Alert.alert('Action failed', 'Unable to remove the student. Please try again.');
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    },
    [currentBusId, loadBusData, students, updateBusCounts]
  );

  const deleteDriverRecords = useCallback(async () => {
    if (!driver) {
      return;
    }

    const driverDocId = driver.id || driver.userId;
    if (driverDocId) {
      await deleteDoc(doc(db, 'users', driverDocId));
    }
    await deleteDoc(doc(db, 'buses', currentBusId, 'staff', 'driver'));
    if (driver.userId) {
      await deleteDoc(doc(db, 'buses', currentBusId, 'staff', driver.userId));
    }
  }, [currentBusId, driver]);

  const handleDriverRemoval = useCallback(() => {
    if (!driver) {
      return;
    }

    Alert.alert(
      'Remove Driver',
      `Remove driver ${driver.name || driver.userId || 'Driver'} from ${currentBusId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              await deleteDriverRecords();
              await loadBusData();
            } catch (err) {
              console.error('❌ [BUS EDIT] Failed to remove driver:', err);
              Alert.alert('Action failed', 'Unable to remove the driver. Please try again.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }, [currentBusId, deleteDriverRecords, driver, loadBusData]);

  const handleCoAdminRemoval = useCallback(
    (coAdmin) => {
      Alert.alert(
        'Remove Co-Admin',
        `Remove ${coAdmin.name || coAdmin.userId} from ${currentBusId}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                setSaving(true);
                await deleteDoc(doc(db, 'users', coAdmin.id || coAdmin.userId));
                await deleteDoc(doc(db, 'buses', currentBusId, 'staff', coAdmin.userId || 'coadmin'));
                await deleteDoc(doc(db, 'buses', currentBusId, 'staff', 'coadmin'));
                await loadBusData();
              } catch (err) {
                console.error('❌ [BUS EDIT] Failed to remove co-admin:', err);
                Alert.alert('Action failed', 'Unable to remove the co-admin. Please try again.');
              } finally {
                setSaving(false);
              }
            },
          },
        ]
      );
    },
    [currentBusId, loadBusData]
  );

  const handleAddStudent = useCallback(async () => {
    const registerNumber = studentForm.registerNumber.trim().toUpperCase();
    const studentName = studentForm.name.trim();
    const passwordValue = studentForm.password.trim();

    if (!registerNumber || !studentName || !passwordValue) {
      Alert.alert('Missing details', 'Register number, name, and password are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId: registerNumber,
        registerNumber,
        name: studentName,
        role: 'student',
        password: passwordValue,
        busNumber: currentBusId,
        busDisplayName: displayNameInput,
        year: studentForm.year,
        department: studentForm.department,
        boardingPoint: studentForm.boardingPoint,
        status: 'Active',
        authenticated: true,
        registeredAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', registerNumber), payload, { merge: true });
      await setDoc(
        doc(db, 'buses', currentBusId, 'students', registerNumber),
        {
          registerNumber,
          name: studentName,
          year: studentForm.year,
          department: studentForm.department,
          boardingPoint: studentForm.boardingPoint,
          status: 'Active',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

  registeredUsersStorage.invalidateStudentCache();
  setStudentForm(DEFAULT_STUDENT_FORM);
      setShowStudentForm(false);
      await loadBusData();
      await updateBusCounts(currentBusId, students.length + 1);
    } catch (err) {
      console.error('❌ [BUS EDIT] Failed to add student:', err);
      Alert.alert('Action failed', 'Unable to add the student. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [currentBusId, displayNameInput, loadBusData, studentForm, students.length, updateBusCounts]);

  const handleAddDriver = useCallback(() => {
    const userId = driverForm.userId.trim();
    const password = driverForm.password.trim();
    const name = driverForm.name.trim() || 'Driver';

    if (!userId || !password) {
      Alert.alert('Missing details', 'Driver user ID and password are required.');
      return;
    }

    const executeAdd = async (replaceExisting = false) => {
      try {
        setSaving(true);

        if (replaceExisting) {
          await deleteDriverRecords();
        }

        const payload = {
          userId,
          role: 'driver',
          password,
          name,
          phone: driverForm.phone.trim(),
          busNumber: currentBusId,
          busDisplayName: displayNameInput,
          status: 'Active',
          authenticated: true,
          registeredAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', userId), payload, { merge: true });
        await setDoc(
          doc(db, 'buses', currentBusId, 'staff', 'driver'),
          {
            userId,
            password,
            name,
            phone: driverForm.phone.trim(),
            role: 'driver',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await setDoc(
          doc(db, 'buses', currentBusId, 'staff', userId),
          {
            userId,
            password,
            name,
            phone: driverForm.phone.trim(),
            role: 'driver',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setDriverForm(DEFAULT_DRIVER_FORM);
        setShowDriverForm(false);
        await loadBusData();
      } catch (err) {
        console.error('❌ [BUS EDIT] Failed to add driver:', err);
        Alert.alert('Action failed', 'Unable to add the driver. Please try again.');
      } finally {
        setSaving(false);
      }
    };

    if (driver) {
      Alert.alert(
        'Replace Driver',
        'A driver is already assigned to this bus. Replace the existing driver account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              executeAdd(true);
            },
          },
        ]
      );
    } else {
      executeAdd(false);
    }
  }, [currentBusId, deleteDriverRecords, displayNameInput, driver, driverForm, loadBusData]);

  const handleAddCoAdmin = useCallback(async () => {
    const userId = coAdminForm.userId.trim();
    const password = coAdminForm.password.trim();
    const name = coAdminForm.name.trim() || 'Co-Admin';

    if (!userId || !password) {
      Alert.alert('Missing details', 'Co-admin user ID and password are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        userId,
        role: 'coadmin',
        password,
        name,
        phone: coAdminForm.phone.trim(),
        busNumber: currentBusId,
        busDisplayName: displayNameInput,
        status: 'Active',
        authenticated: true,
        registeredAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', userId), payload, { merge: true });
      await setDoc(
        doc(db, 'buses', currentBusId, 'staff', userId),
        {
          userId,
          password,
          name,
          phone: coAdminForm.phone.trim(),
          role: 'coadmin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'buses', currentBusId, 'staff', 'coadmin'),
        {
          userId,
          password,
          name,
          phone: coAdminForm.phone.trim(),
          role: 'coadmin',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setCoAdminForm(DEFAULT_COADMIN_FORM);
      setShowCoAdminForm(false);
      await loadBusData();
    } catch (err) {
      console.error('❌ [BUS EDIT] Failed to add co-admin:', err);
      Alert.alert('Action failed', 'Unable to add the co-admin. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coAdminForm, currentBusId, displayNameInput, loadBusData]);

  const syncUserAssignments = useCallback(
    async (targetBusId, targetDisplayName) => {
      const updates = [];
      students.forEach((student) => {
        updates.push(
          setDoc(
            doc(db, 'users', student.id),
            {
              busNumber: targetBusId,
              busDisplayName: targetDisplayName,
            },
            { merge: true }
          )
        );
      });

      if (driver) {
        updates.push(
          setDoc(
            doc(db, 'users', driver.userId || driver.id),
            {
              busNumber: targetBusId,
              busDisplayName: targetDisplayName,
            },
            { merge: true }
          )
        );
      }

      coAdmins.forEach((item) => {
        updates.push(
          setDoc(
            doc(db, 'users', item.id || item.userId),
            {
              busNumber: targetBusId,
              busDisplayName: targetDisplayName,
            },
            { merge: true }
          )
        );
      });

      await Promise.allSettled(updates);
    },
    [coAdmins, driver, students]
  );

  const reassignBusDocument = useCallback(
    async (currentId, nextId, nextDisplayName) => {
      const nowIso = new Date().toISOString();
      const currentRef = doc(db, 'buses', currentId);
      const nextRef = doc(db, 'buses', nextId);

      const currentSnapshot = await getDoc(currentRef);
      const currentData = currentSnapshot.exists() ? currentSnapshot.data() : {};

      await setDoc(
        nextRef,
        {
          ...currentData,
          busNumber: nextId,
          displayName: nextDisplayName,
          updatedAt: nowIso,
          migratedFrom: currentId,
        },
        { merge: true }
      );

      const studentCollection = await getDocs(collection(currentRef, 'students'));
      const staffCollection = await getDocs(collection(currentRef, 'staff'));

      await Promise.all(
        studentCollection.docs.map((docSnap) =>
          setDoc(doc(nextRef, 'students', docSnap.id), docSnap.data(), { merge: true })
        )
      );

      await Promise.all(
        staffCollection.docs.map((docSnap) =>
          setDoc(doc(nextRef, 'staff', docSnap.id), docSnap.data(), { merge: true })
        )
      );

      await Promise.all(
        studentCollection.docs.map((docSnap) => deleteDoc(doc(currentRef, 'students', docSnap.id)))
      );
      await Promise.all(
        staffCollection.docs.map((docSnap) => deleteDoc(doc(currentRef, 'staff', docSnap.id)))
      );

      await deleteDoc(currentRef);
    },
    []
  );

  const handleSaveBusInfo = useCallback(async () => {
    const nextBusId = normalizeBusNumber(busNumberInput);
    const nextDisplayName = displayNameInput.trim() || nextBusId;

    if (!nextBusId) {
      Alert.alert('Invalid value', 'Please provide a valid bus number.');
      return;
    }

    try {
      setSaving(true);

      if (nextBusId !== currentBusId) {
        const existingTarget = await getDoc(doc(db, 'buses', nextBusId));
        if (existingTarget.exists()) {
          Alert.alert(
            'Bus already exists',
            'A bus with this number already exists. Please choose another number.'
          );
          setSaving(false);
          return;
        }

        await reassignBusDocument(currentBusId, nextBusId, nextDisplayName);
        await syncUserAssignments(nextBusId, nextDisplayName);

        setCurrentBusId(nextBusId);
        setBusNumberInput(nextBusId);
        setDisplayNameInput(nextDisplayName);
      } else {
        await setDoc(
          doc(db, 'buses', currentBusId),
          {
            busNumber: currentBusId,
            displayName: nextDisplayName,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        await syncUserAssignments(currentBusId, nextDisplayName);
      }

      await loadBusData();
      Alert.alert('Saved', 'Bus details have been updated.');
    } catch (err) {
      console.error('❌ [BUS EDIT] Failed to save bus info:', err);
      Alert.alert('Save failed', 'Unable to update the bus details. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [busNumberInput, currentBusId, displayNameInput, loadBusData, reassignBusDocument, syncUserAssignments]);

  const renderSectionHeader = (title, action) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Bus Details</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading bus data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {error ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {!isCoAdmin && (
            <View style={styles.card}>
              {renderSectionHeader('Bus Information')}
              <Text style={styles.label}>Bus Number</Text>
              <TextInput
                style={styles.input}
                value={busNumberInput}
                autoCapitalize="characters"
                onChangeText={setBusNumberInput}
                placeholder="SIET-001"
              />
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayNameInput}
                onChangeText={setDisplayNameInput}
                placeholder="SIET - 001"
              />
              <TouchableOpacity
                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
                onPress={handleSaveBusInfo}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="save" size={18} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Updating the bus number will migrate all linked students, drivers, and co-admins to the new number.
              </Text>
            </View>
          )}

          <View style={styles.card}>
            {renderSectionHeader(
              `Students (${students.length})`,
              <TouchableOpacity
                style={styles.inlineAction}
                onPress={() => setShowStudentForm((prev) => !prev)}
              >
                <Ionicons name={showStudentForm ? 'remove' : 'add'} size={18} color={COLORS.primary} />
                <Text style={styles.inlineActionText}>{showStudentForm ? 'Cancel' : 'Add Student'}</Text>
              </TouchableOpacity>
            )}

            {showStudentForm && (
              <View style={styles.formBlock}>
                <TextInput
                  style={styles.input}
                  value={studentForm.registerNumber}
                  autoCapitalize="characters"
                  placeholder="Register Number"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, registerNumber: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={studentForm.name}
                  placeholder="Student Name"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, name: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={studentForm.year}
                  placeholder="Year (e.g., 3rd Year)"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, year: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={studentForm.department}
                  autoCapitalize="characters"
                  placeholder="Department (e.g., CSE)"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, department: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={studentForm.boardingPoint}
                  placeholder="Boarding Point"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, boardingPoint: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={studentForm.password}
                  placeholder="Password"
                  onChangeText={(value) => setStudentForm((prev) => ({ ...prev, password: value }))}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddStudent}>
                  <Ionicons name="person-add" size={18} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>Add Student</Text>
                </TouchableOpacity>
              </View>
            )}

            {students.length === 0 ? (
              <Text style={styles.emptyText}>No students assigned yet.</Text>
            ) : (
              students.map((student) => (
                <View key={student.id} style={styles.listItem}>
                  <View style={styles.listMeta}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={18} color={COLORS.white} />
                    </View>
                    <View style={styles.listTextBlock}>
                      <Text style={styles.listTitle}>{student.name}</Text>
                      <Text style={styles.listSubtitle}>{student.registerNumber}</Text>
                      <Text style={styles.listSubtitle}>
                        {student.department} • {student.year}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleStudentRemoval(student)}>
                    <Ionicons name="trash" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            {renderSectionHeader(
              'Driver',
              <View style={styles.inlineActionGroup}>
                <TouchableOpacity
                  style={styles.inlineAction}
                  onPress={() => setShowDriverForm((prev) => !prev)}
                >
                  <Ionicons
                    name={showDriverForm ? 'remove' : 'add'}
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={styles.inlineActionText}>
                    {showDriverForm ? 'Cancel' : driver ? 'Replace Driver' : 'Add Driver'}
                  </Text>
                </TouchableOpacity>
                {driver && (
                  <TouchableOpacity
                    style={[styles.inlineAction, styles.inlineDangerAction]}
                    onPress={handleDriverRemoval}
                  >
                    <Ionicons name="trash" size={18} color={COLORS.danger} />
                    <Text style={[styles.inlineActionText, { color: COLORS.danger }]}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {driver && (
              <View style={styles.listItem}>
                <View style={styles.listMeta}>
                  <View style={[styles.avatar, { backgroundColor: COLORS.success }]}>
                    <Ionicons name="bus" size={18} color={COLORS.white} />
                  </View>
                  <View style={styles.listTextBlock}>
                    <Text style={styles.listTitle}>{driver.name || driver.userId}</Text>
                    <Text style={styles.listSubtitle}>User ID: {driver.userId}</Text>
                    {driver.phone ? (
                      <Text style={styles.listSubtitle}>Phone: {driver.phone}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            )}

            {showDriverForm && (
              <View style={styles.formBlock}>
                <TextInput
                  style={styles.input}
                  value={driverForm.userId}
                  placeholder="Driver User ID"
                  autoCapitalize="none"
                  onChangeText={(value) => setDriverForm((prev) => ({ ...prev, userId: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={driverForm.password}
                  placeholder="Password"
                  secureTextEntry
                  onChangeText={(value) => setDriverForm((prev) => ({ ...prev, password: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={driverForm.name}
                  placeholder="Driver Name (optional)"
                  onChangeText={(value) => setDriverForm((prev) => ({ ...prev, name: value }))}
                />
                <TextInput
                  style={styles.input}
                  value={driverForm.phone}
                  placeholder="Phone (optional)"
                  keyboardType="phone-pad"
                  onChangeText={(value) => setDriverForm((prev) => ({ ...prev, phone: value }))}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleAddDriver}>
                  <Ionicons name="person-add" size={18} color={COLORS.white} />
                  <Text style={styles.primaryButtonText}>
                    {driver ? 'Replace Driver Account' : 'Create Driver Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isCoAdmin && (
            <View style={styles.card}>
              {renderSectionHeader(
                `Co-Admins (${coAdmins.length})`,
                <TouchableOpacity
                  style={styles.inlineAction}
                  onPress={() => setShowCoAdminForm((prev) => !prev)}
                >
                  <Ionicons name={showCoAdminForm ? 'remove' : 'add'} size={18} color={COLORS.primary} />
                  <Text style={styles.inlineActionText}>{showCoAdminForm ? 'Cancel' : 'Add Co-Admin'}</Text>
                </TouchableOpacity>
              )}

              {showCoAdminForm && (
                <View style={styles.formBlock}>
                  <TextInput
                    style={styles.input}
                    value={coAdminForm.userId}
                    placeholder="Co-Admin User ID"
                    autoCapitalize="none"
                    onChangeText={(value) => setCoAdminForm((prev) => ({ ...prev, userId: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    value={coAdminForm.password}
                    placeholder="Password"
                    secureTextEntry
                    onChangeText={(value) => setCoAdminForm((prev) => ({ ...prev, password: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    value={coAdminForm.name}
                    placeholder="Name (optional)"
                    onChangeText={(value) => setCoAdminForm((prev) => ({ ...prev, name: value }))}
                  />
                  <TextInput
                    style={styles.input}
                    value={coAdminForm.phone}
                    placeholder="Phone (optional)"
                    keyboardType="phone-pad"
                    onChangeText={(value) => setCoAdminForm((prev) => ({ ...prev, phone: value }))}
                  />
                  <TouchableOpacity style={styles.primaryButton} onPress={handleAddCoAdmin}>
                    <Ionicons name="person-add" size={18} color={COLORS.white} />
                    <Text style={styles.primaryButtonText}>Create Co-Admin Account</Text>
                  </TouchableOpacity>
                </View>
              )}

              {coAdmins.length === 0 ? (
                <Text style={styles.emptyText}>No co-admins assigned yet.</Text>
              ) : (
                coAdmins.map((coAdmin) => (
                  <View key={coAdmin.id || coAdmin.userId} style={styles.listItem}>
                    <View style={styles.listMeta}>
                      <View style={[styles.avatar, { backgroundColor: COLORS.info }]}>
                        <Ionicons name="shield" size={18} color={COLORS.white} />
                      </View>
                      <View style={styles.listTextBlock}>
                        <Text style={styles.listTitle}>{coAdmin.name || coAdmin.userId}</Text>
                        <Text style={styles.listSubtitle}>User ID: {coAdmin.userId}</Text>
                        {coAdmin.phone ? (
                          <Text style={styles.listSubtitle}>Phone: {coAdmin.phone}</Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleCoAdminRemoval(coAdmin)}>
                      <Ionicons name="trash" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  placeholder: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  content: {
    padding: SPACING.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.danger}1A`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    marginLeft: SPACING.sm,
    color: COLORS.danger,
    fontFamily: FONTS.medium,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.secondary,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: COLORS.gray,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.regular,
    backgroundColor: COLORS.background,
    color: COLORS.secondary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    marginLeft: SPACING.xs,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: SPACING.sm,
    fontFamily: FONTS.regular,
  },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineDangerAction: {
    marginLeft: SPACING.sm,
  },
  inlineActionText: {
    marginLeft: SPACING.xs,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
  },
  emptyText: {
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.lightGray}66`,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  listTextBlock: {
    flex: 1,
  },
  listTitle: {
    fontFamily: FONTS.semiBold,
    color: COLORS.secondary,
  },
  listSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: FONTS.regular,
  },
  formBlock: {
    backgroundColor: `${COLORS.primary}0F`,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
});

export default BusEditScreen;