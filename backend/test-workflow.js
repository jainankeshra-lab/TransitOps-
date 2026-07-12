// Using native global fetch available in Node.js v22+
const BASE_URL = 'http://127.0.0.1:5000/api';

const runTests = async () => {
  console.log('🚀 Starting TransitOps End-to-End Workflow Verification...');
  
  let token = '';
  let vehicleId = '';
  let driverId = '';
  let tripId = '';
  let maintenanceId = '';

  try {
    // 1. Authenticate as Fleet Manager
    console.log('\n🔑 Step 1: Logging in as Fleet Manager...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@transitops.com', password: 'password123' })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${await loginRes.text()}`);
    }
    
    const loginData = await loginRes.json();
    token = loginData.token;
    console.log('✅ Logged in successfully. Token acquired.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Register vehicle 'Van-05'
    console.log('\n🚚 Step 2: Registering vehicle "Van-05" (maxCapacity = 500kg)...');
    const vehicleRes = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        registrationNumber: 'VAN-05',
        name: 'Delivery Van 05',
        type: 'Van',
        maxCapacity: 500,
        odometer: 0,
        acquisitionCost: 20000,
        status: 'Available',
        region: 'Central'
      })
    });

    if (!vehicleRes.ok) {
      throw new Error(`Failed to create vehicle: ${await vehicleRes.text()}`);
    }

    const vehicleData = await vehicleRes.json();
    vehicleId = vehicleData._id;
    console.log(`✅ Vehicle created with ID: ${vehicleId}. Status: ${vehicleData.status}`);

    // 3. Register driver 'Alex'
    console.log('\n👨‍✈️ Step 3: Registering driver "Alex" (valid license)...');
    const driverRes = await fetch(`${BASE_URL}/drivers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: 'Alex',
        licenseNumber: 'DL-ALEX777',
        licenseCategory: 'Commercial',
        licenseExpiry: '2028-12-31',
        contact: '+15559876',
        safetyScore: 100,
        status: 'Available'
      })
    });

    if (!driverRes.ok) {
      throw new Error(`Failed to create driver: ${await driverRes.text()}`);
    }

    const driverData = await driverRes.json();
    driverId = driverData._id;
    console.log(`✅ Driver created with ID: ${driverId}. Status: ${driverData.status}`);

    // 4. Create a trip with Cargo Weight = 450 kg
    console.log('\n📦 Step 4: Creating a Draft Trip with Cargo Weight = 450kg...');
    const tripRes = await fetch(`${BASE_URL}/trips`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source: 'Warehouse North',
        destination: 'Retail Store 5',
        vehicleId,
        driverId,
        cargoWeight: 450,
        plannedDistance: 120,
        revenue: 350
      })
    });

    if (!tripRes.ok) {
      throw new Error(`Failed to create trip: ${await tripRes.text()}`);
    }

    const tripData = await tripRes.json();
    tripId = tripData._id;
    console.log(`✅ Draft Trip created with ID: ${tripId}. Status: ${tripData.status}`);

    // 5. Dispatch the trip
    console.log('\n🚦 Step 5: Dispatching the Trip (executing business validations)...');
    const dispatchRes = await fetch(`${BASE_URL}/trips/${tripId}/dispatch`, {
      method: 'POST',
      headers
    });

    if (!dispatchRes.ok) {
      throw new Error(`Failed to dispatch trip: ${await dispatchRes.text()}`);
    }

    const dispatchData = await dispatchRes.json();
    console.log(`✅ Trip Dispatched. Response message: "${dispatchData.message}"`);

    // Verify Vehicle & Driver status is On Trip
    const getVehicleRes = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, { headers });
    const getDriverRes = await fetch(`${BASE_URL}/drivers/${driverId}`, { headers });
    
    const vCheck = await getVehicleRes.json();
    const dCheck = await getDriverRes.json();

    console.log(`🔍 Verification - Vehicle Status: ${vCheck.status} (Expected: On Trip)`);
    console.log(`🔍 Verification - Driver Status: ${dCheck.status} (Expected: On Trip)`);

    if (vCheck.status !== 'On Trip' || dCheck.status !== 'On Trip') {
      throw new Error('Verification failed: Vehicle or Driver status is not "On Trip" after dispatch.');
    }
    console.log('✅ Dispatch state transition verified.');

    // 6. Complete the trip
    console.log('\n🏁 Step 6: Completing the Trip (updating odometer & fuel consumption)...');
    const completeRes = await fetch(`${BASE_URL}/trips/${tripId}/complete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        finalOdometer: 120,
        fuelConsumed: 10
      })
    });

    if (!completeRes.ok) {
      throw new Error(`Failed to complete trip: ${await completeRes.text()}`);
    }

    const completeData = await completeRes.json();
    console.log(`✅ Trip Completed. Response message: "${completeData.message}"`);

    // Verify Vehicle & Driver status is Available, and Vehicle Odometer is updated
    const getVehicleRes2 = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, { headers });
    const getDriverRes2 = await fetch(`${BASE_URL}/drivers/${driverId}`, { headers });
    
    const vCheck2 = await getVehicleRes2.json();
    const dCheck2 = await getDriverRes2.json();

    console.log(`🔍 Verification - Vehicle Status: ${vCheck2.status} (Expected: Available)`);
    console.log(`🔍 Verification - Vehicle Odometer: ${vCheck2.odometer} km (Expected: 120 km)`);
    console.log(`🔍 Verification - Driver Status: ${dCheck2.status} (Expected: Available)`);

    if (vCheck2.status !== 'Available' || vCheck2.odometer !== 120 || dCheck2.status !== 'Available') {
      throw new Error('Verification failed: Vehicle/Driver status or odometer is incorrect after completion.');
    }
    console.log('✅ Completion state transition verified.');

    // 7. Create a maintenance record
    console.log('\n🔧 Step 7: Creating maintenance record (e.g., Oil Change) for "VAN-05"...');
    const maintRes = await fetch(`${BASE_URL}/maintenance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        vehicleId,
        description: 'Oil Change and Filter Replacement',
        cost: 150,
        startDate: new Date()
      })
    });

    if (!maintRes.ok) {
      throw new Error(`Failed to create maintenance log: ${await maintRes.text()}`);
    }

    const maintData = await maintRes.json();
    maintenanceId = maintData._id;
    console.log(`✅ Maintenance Log created with ID: ${maintenanceId}. Status: ${maintData.status}`);

    // Verify Vehicle status is In Shop
    const getVehicleRes3 = await fetch(`${BASE_URL}/vehicles/${vehicleId}`, { headers });
    const vCheck3 = await getVehicleRes3.json();
    console.log(`🔍 Verification - Vehicle Status: ${vCheck3.status} (Expected: In Shop)`);

    if (vCheck3.status !== 'In Shop') {
      throw new Error('Verification failed: Vehicle status is not "In Shop" after opening maintenance.');
    }
    console.log('✅ Maintenance In-Shop transition verified.');

    // 8. Query reports to check calculated operational cost & fuel efficiency
    console.log('\n📊 Step 8: Querying reports and analytics for "VAN-05"...');
    const analyticsRes = await fetch(`${BASE_URL}/reports/analytics`, { headers });
    if (!analyticsRes.ok) {
      throw new Error(`Failed to fetch analytics: ${await analyticsRes.text()}`);
    }
    
    const analyticsData = await analyticsRes.json();
    const van05Stats = analyticsData.find(item => item.registrationNumber === 'VAN-05');
    
    if (!van05Stats) {
      throw new Error('Verification failed: "VAN-05" statistics not found in analytics payload.');
    }

    console.log(`📈 "VAN-05" Analytics Result:`);
    console.log(`   - Total Distance: ${van05Stats.totalDistance} km`);
    console.log(`   - Fuel Cost: $${van05Stats.fuelCost}`);
    console.log(`   - Maintenance Cost: $${van05Stats.maintenanceCost}`);
    console.log(`   - Fuel Efficiency: ${van05Stats.fuelEfficiency} km/L`);
    console.log(`   - Calculated ROI: ${van05Stats.roi}%`);

    console.log('\n🎉 ALL HACKATHON WORKFLOW VERIFICATIONS PASSED SUCCESSFULLY! 🎉');
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Verification Failed: ${error.message}`);
    process.exit(1);
  }
};

runTests();
