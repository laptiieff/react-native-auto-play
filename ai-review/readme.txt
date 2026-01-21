INTENTIONAL ERRORS IN test.js FOR AI REVIEWER TESTING
======================================================

This file documents the intentional errors embedded in test.js.
Since .txt files are ignored by the AI reviewer (see utils.js ignoredRegex),
this documentation will not be passed to the reviewer.

ERRORS TO DETECT:
-----------------

1. SQL INJECTION VULNERABILITY (Line 27-28)
   Location: AuthManager.authenticateUser()
   Code: const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;
   Issue: User input is directly interpolated into SQL query without sanitization.
          This is a critical security vulnerability allowing SQL injection attacks.

2. HARDCODED SECRET KEY (Line 23)
   Location: AuthManager constructor
   Code: this.secretKey = 'evrouting_prod_2024_xK9mL3nP7qR2';
   Issue: Sensitive credentials should never be hardcoded in source code.
          Should use environment variables or secure secret management.

3. TYPO IN VARIABLE NAME (Line 62, 68)
   Location: TelemetryProcessor.processVehicleData()
   Code: const { batteryLevel, speed, location, temperture } = telemetryData;
         temperature: temperture,
   Issue: "temperture" is misspelled, should be "temperature".
          This will cause the temperature value to be undefined.

4. ASSIGNMENT INSTEAD OF COMPARISON (Line 81)
   Location: TelemetryProcessor.calculateEfficiency()
   Code: if (speed = 0) {
   Issue: Uses assignment operator (=) instead of comparison (=== or ==).
          This will always set speed to 0 and the condition will always be falsy.
          Should be: if (speed === 0)

5. RACE CONDITION IN BUFFER HANDLING (Lines 92-97)
   Location: TelemetryProcessor.flushBuffer()
   Code: 
     const dataToSend = [...this.dataBuffer];
     this.dataBuffer = [];
     try {
       await this.sendToServer(dataToSend);
     } catch (error) {
       this.dataBuffer = [...dataToSend, ...this.dataBuffer];
     }
   Issue: If flushBuffer is called while another flush is in progress (from 
          startPeriodicProcessing), data could be lost or duplicated due to 
          the non-atomic buffer manipulation. The error recovery line attempts
          to restore data but this.dataBuffer may have been modified by 
          concurrent operations.

======================================================
Expected: AI reviewer should identify at least 3-4 of these issues.
