#!/bin/bash
CASE_ID=$(curl -s -b cookies.txt "http://localhost:3000/api/cases?page=1&pageSize=1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
PASS=0; FAIL=0
R() {
  if [ "$4" = "$3" ]; then
    echo "PASS | $1 | $2"
    PASS=$((PASS+1))
  else
    echo "FAIL | $1 | $2 (exp=$3 got=$4)"
    FAIL=$((FAIL+1))
  fi
}

echo "============================================"
echo " OIG-ITS COMPREHENSIVE TEST RESULTS"
echo " $(date '+%Y-%m-%d %H:%M')"
echo "============================================"

echo ""
echo "=== 1. SECURITY ==="
C=$(curl -s -b cookies.txt -o/dev/null -w "%{http_code}" http://localhost:3000/api/audit-logs); R S10a "RBAC: Investigator blocked from audit" 403 "$C"
C=$(curl -s -b cookies_admin.txt -o/dev/null -w "%{http_code}" http://localhost:3000/api/audit-logs); R S10b "RBAC: Admin reads audit logs" 200 "$C"
C=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"email":"blocked@test.com","firstName":"B","lastName":"B","password":"12345678"}' -o/dev/null -w "%{http_code}"); R S10c "RBAC: Investigator blocked from user create" 403 "$C"
C=$(curl -s -X POST http://localhost:3000/api/auth/reset-password -H "Content-Type: application/json" -d '{"email":"samuel.johnson@oig.gov"}' -o/dev/null -w "%{http_code}"); R S11 "Password reset endpoint" 200 "$C"

echo ""
echo "=== 2. CASE CRUD ==="
NC=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/cases -H "Content-Type: application/json" -d '{"title":"Comprehensive test case creation","caseType":"FRAUD","priority":"HIGH"}')
NC_ID=$(echo "$NC" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
R CM1 "Create case" true "$([ -n "$NC_ID" ] && echo true || echo false)"

C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID" -o/dev/null -w "%{http_code}"); R CM1b "Read case detail" 200 "$C"

C=$(curl -s -b cookies.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID" -H "Content-Type: application/json" -d '{"priority":"CRITICAL","complaintSource":"HOTLINE"}' -o/dev/null -w "%{http_code}"); R CM7 "Update case + categorization" 200 "$C"

C=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/cases -H "Content-Type: application/json" -d '{"isDraft":true,"caseType":"ABUSE"}' -o/dev/null -w "%{http_code}"); R CM17 "Create draft case" 201 "$C"

echo ""
echo "=== 3. CASE STATUS & LOCKING ==="
C=$(curl -s -b cookies.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID" -H "Content-Type: application/json" -d '{"status":"OPEN","reason":"Opened for investigation"}' -o/dev/null -w "%{http_code}"); R CM18 "Status change INTAKE->OPEN" 200 "$C"

C=$(curl -s -b cookies_admin.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID" -H "Content-Type: application/json" -d '{"isLocked":true}' -o/dev/null -w "%{http_code}"); R CM38a "Admin locks case" 200 "$C"

C=$(curl -s -b cookies.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID" -H "Content-Type: application/json" -d '{"title":"Should be rejected"}' -o/dev/null -w "%{http_code}"); R CM38b "Locked case rejects edit (423)" 423 "$C"

curl -s -b cookies_admin.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID" -H "Content-Type: application/json" -d '{"isLocked":false}' -o/dev/null

echo ""
echo "=== 4. SUBJECTS ==="
NS=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/subjects -H "Content-Type: application/json" -d '{"type":"INDIVIDUAL","firstName":"Test","lastName":"Subject","email":"test.subject@example.com"}')
NS_ID=$(echo "$NS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
R CM8a "Create subject" true "$([ -n "$NS_ID" ] && echo true || echo false)"

C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/subjects" -H "Content-Type: application/json" -d "{\"subjectId\":\"$NS_ID\",\"role\":\"RESPONDENT\"}" -o/dev/null -w "%{http_code}"); R CM8b "Link subject to case" 201 "$C"

CS_ID=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/subjects" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C=$(curl -s -b cookies.txt -X PATCH "http://localhost:3000/api/cases/$NC_ID/subjects?caseSubjectId=$CS_ID" -H "Content-Type: application/json" -d '{"role":"WITNESS"}' -o/dev/null -w "%{http_code}"); R CM9 "Change subject role" 200 "$C"

echo ""
echo "=== 5. VIOLATIONS & FINANCIAL ==="
C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/violations" -H "Content-Type: application/json" -d "{\"subjectId\":\"$NS_ID\",\"type\":\"FRAUD\",\"title\":\"Procurement fraud charge\"}" -o/dev/null -w "%{http_code}"); R CM6 "Create violation" 201 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/violations" -o/dev/null -w "%{http_code}"); R CM6b "List violations" 200 "$C"

C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/financial-results" -H "Content-Type: application/json" -d '{"type":"RECOVERY","amount":250000,"description":"Recovered procurement funds"}' -o/dev/null -w "%{http_code}"); R CM32 "Create financial result" 201 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/financial-results" -o/dev/null -w "%{http_code}"); R CM32b "List financial results" 200 "$C"

C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/subject-actions" -H "Content-Type: application/json" -d "{\"subjectId\":\"$NS_ID\",\"category\":\"LEGAL\",\"type\":\"INDICTMENT\",\"description\":\"Grand jury indictment\"}" -o/dev/null -w "%{http_code}"); R CM29 "Subject action" 201 "$C"

echo ""
echo "=== 6. TECHNIQUES & REFERRALS ==="
C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/techniques" -H "Content-Type: application/json" -d '{"type":"SEARCH_WARRANT","description":"Office search warrant executed","date":"2026-03-25T14:00:00Z","status":"COMPLETED"}' -o/dev/null -w "%{http_code}"); R CM10 "Record technique" 201 "$C"

C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/referrals" -H "Content-Type: application/json" -d '{"agencyName":"FBI","agencyType":"FEDERAL","reason":"Criminal prosecution referral"}' -o/dev/null -w "%{http_code}"); R CM22 "Track referral" 201 "$C"

C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/notes" -H "Content-Type: application/json" -d '{"content":"Completed witness interview. Key findings documented in report."}' -o/dev/null -w "%{http_code}"); R CM13 "Case note" 201 "$C"

CASE_ID2=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/cases -H "Content-Type: application/json" -d '{"title":"Second test case for relationship","caseType":"WASTE","priority":"LOW"}' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
C=$(curl -s -b cookies.txt -X POST "http://localhost:3000/api/cases/$NC_ID/relationships" -H "Content-Type: application/json" -d "{\"toCaseId\":\"$CASE_ID2\",\"relationship\":\"spinoff\"}" -o/dev/null -w "%{http_code}"); R CM4 "Case relationship" 201 "$C"

echo ""
echo "=== 7. DOCUMENTS & EVIDENCE ==="
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/documents" -o/dev/null -w "%{http_code}"); R DMR1 "List documents" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/evidence" -o/dev/null -w "%{http_code}"); R DMR1b "List evidence" 200 "$C"
# ZIP returns 404 for cases with no documents (expected), test with no-doc case
C=$(curl -s -b cookies.txt "http://localhost:3000/api/download-case-docs/$NC_ID" -o/dev/null -w "%{http_code}"); R CM44a "ZIP: no docs returns 404" 404 "$C"
# Verify route is accessible (returns 401 without auth)
C=$(curl -s "http://localhost:3000/api/download-case-docs/$NC_ID" -o/dev/null -w "%{http_code}"); R CM44b "ZIP: route accessible (401 unauth)" 401 "$C"

echo ""
echo "=== 8. HOTLINE & WHISTLEBLOWER ==="
C=$(curl -s -X POST http://localhost:3000/api/public/hotline -H "Content-Type: application/json" -d '{"subject":"Public hotline test","description":"Testing public complaint intake form"}' -o/dev/null -w "%{http_code}"); R HWC1 "Public hotline submit" 201 "$C"
C=$(curl -s -X POST http://localhost:3000/api/public/whistleblower -H "Content-Type: application/json" -d '{"subject":"Retaliation report test","description":"Testing whistleblower form","isAnonymous":true}' -o/dev/null -w "%{http_code}"); R HWC6 "Whistleblower submit" 201 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/inquiries" -o/dev/null -w "%{http_code}"); R HWC1b "Inquiries list" 200 "$C"

echo ""
echo "=== 9. REPORTING & ANALYTICS ==="
C=$(curl -s -b cookies.txt "http://localhost:3000/api/analytics" -o/dev/null -w "%{http_code}"); R RRS21 "Analytics API" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/reports" -o/dev/null -w "%{http_code}"); R RRS31 "Reports API" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/export?format=csv" -o/dev/null -w "%{http_code}"); R RRS13 "CSV export" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/cases/$NC_ID/report" -o/dev/null -w "%{http_code}"); R RRS16 "Full case report" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/saved-searches" -o/dev/null -w "%{http_code}"); R RRS14 "Saved searches" 200 "$C"

echo ""
echo "=== 10. TRAINING ==="
C=$(curl -s -b cookies.txt "http://localhost:3000/api/training/courses" -o/dev/null -w "%{http_code}"); R TM1 "Courses API" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/training/records" -o/dev/null -w "%{http_code}"); R TM4 "Records API" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/training/assignments" -o/dev/null -w "%{http_code}"); R TM6 "Assignments API" 200 "$C"

echo ""
echo "=== 11. TIME & LABOR ==="
C=$(curl -s -b cookies.txt -X POST http://localhost:3000/api/time-entries -H "Content-Type: application/json" -d "{\"date\":\"2026-03-28\",\"hours\":7.5,\"activityType\":\"CASE_WORK\",\"caseId\":\"$NC_ID\"}" -o/dev/null -w "%{http_code}"); R TLT2 "Log time entry" 201 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/time-entries" -o/dev/null -w "%{http_code}"); R TLT2b "List time entries" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/timesheets" -o/dev/null -w "%{http_code}"); R T1 "Timesheets API" 200 "$C"

echo ""
echo "=== 12. INVENTORY & CALENDAR ==="
C=$(curl -s -b cookies.txt "http://localhost:3000/api/inventory" -o/dev/null -w "%{http_code}"); R AF6 "Inventory API" 200 "$C"
C=$(curl -s -b cookies.txt "http://localhost:3000/api/calendar" -o/dev/null -w "%{http_code}"); R CM43 "Calendar API" 200 "$C"

echo ""
echo "=== 13. AUDIT ==="
C=$(curl -s -b cookies_admin.txt "http://localhost:3000/api/audit-logs?pageSize=3" -o/dev/null -w "%{http_code}"); R AF1 "Audit logs" 200 "$C"

echo ""
echo "=== 14. DATA IMPORT ==="
C=$(curl -s -b cookies_admin.txt -X POST http://localhost:3000/api/import/cases -H "Content-Type: application/json" -d '[{"title":"Bulk imported test case for verification","caseType":"COMPLIANCE","priority":"LOW"}]' -o/dev/null -w "%{http_code}"); R DM1 "Bulk case import" 200 "$C"

echo ""
echo "=== 15. ALL DASHBOARD PAGES ==="
for p in cases tasks approvals notifications search evidence documents users workflows analytics reports audit-log settings subjects inventory timesheets training calendar inquiries; do
  C=$(curl -s -b cookies.txt -o/dev/null -w "%{http_code}" "http://localhost:3000/dashboard/$p"); R PG "/dashboard/$p" 200 "$C"
done

echo ""
echo "=== 16. PUBLIC PAGES ==="
C=$(curl -s -o/dev/null -w "%{http_code}" http://localhost:3000/login); R PG "/login" 200 "$C"
C=$(curl -s -o/dev/null -w "%{http_code}" http://localhost:3000/hotline); R PG "/hotline" 200 "$C"
C=$(curl -s -o/dev/null -w "%{http_code}" http://localhost:3000/whistleblower); R PG "/whistleblower" 200 "$C"

echo ""
echo "============================================"
printf " FINAL RESULTS: PASS=%d  FAIL=%d  TOTAL=%d\n" $PASS $FAIL $((PASS+FAIL))
echo "============================================"
