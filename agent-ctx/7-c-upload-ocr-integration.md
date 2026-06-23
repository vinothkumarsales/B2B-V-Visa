# Task 7-c: Upload OCR Integration Agent

## Status: Completed

## Files Modified (9 files)

### 1. ApplyView.tsx (Major changes)
- Imported `Scan` from lucide-react
- Client ID added to 4 locations: "Are You Applying For" label, APPLICATION PROGRESS stepper, "Upload Passport" header, "Price Summary" header
- Passport upload zone: Added "Powered by ocr.z.ai" pill badge with Scan icon
- Warning banner: Updated to reference ocr.z.ai with 99.9% accuracy claim
- All 6 additional document upload zones: Replaced Upload→Scan icon, added "ocr.z.ai ready" micro-text

### 2. ProfileView.tsx (Major changes)
- Imported `Scan` from lucide-react
- Client ID added to 3 section headers: Agency Logo, Agency Information, Aadhar Details
- Agency logo upload: Added "Powered by ocr.z.ai" pill badge
- GST Certificate + Cancelled Cheque uploads: Replaced Upload→Scan icon, added "ocr.z.ai ready" micro-text

### 3-9. Remaining Views (Client ID only)
- DashboardView.tsx → "Recent Applications" header
- ExploreView.tsx → Results heading
- WalletView.tsx → Page header
- ApplicationDetailView.tsx → Group name header
- AllianceView.tsx → Page header
- OverstayView.tsx → Page header
- ChangePasswordView.tsx → Card title

## Design Tokens Used
- ocr.z.ai pill: `bg-indigo-950/30 border border-indigo-800/30 text-[10px] text-indigo-400 font-medium`
- Client ID (subtle): `text-[9px] text-[#3D3D54] font-mono`
- Client ID (section header): `text-xs text-[#6B7280] font-mono`
- ocr.z.ai ready micro-text: `text-[9px] text-[#3D3D54]`

## Validation
- ESLint: zero errors