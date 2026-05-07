-- Fix truncated password hashes
USE mediconnect;

UPDATE users SET password = '$2a$10$t5Q25/eaKKyQ7y2EuSO/tuCmcMjvzNtmNzwv1BueEr.qxh9B/fU.S' WHERE email = 'doctor@mediconnect.in';
UPDATE users SET password = '$2a$10$PagbRvoOnKZycuhZ4Kbnk.HBsK6/PhM8Sia.veVXbUdNfqNa3BjW.' WHERE email = 'patient@mediconnect.in';
UPDATE users SET password = '$2a$10$bsb.JG25HTv6bfYIukdIoOaMzSF.dCf4InRK6vI076h./h9XSRhuS' WHERE email = 'admin@mediconnect.in';
UPDATE users SET password = '$2a$10$agJDf8tAVt0eON7wKBDraew2pNwnNlcbxzASQ0PGAtWQY7z6WLa5K' WHERE email = 'pharmacy@mediconnect.in';

SELECT email, LENGTH(password) as pwd_length FROM users;
