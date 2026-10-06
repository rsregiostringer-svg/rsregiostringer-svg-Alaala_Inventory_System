const fs = require('fs');
let txt = fs.readFileSync('src/pages/UserRolesPage.jsx', 'utf8');
const start = txt.indexOf('      {/* Top Banner & Title: Section 29 Spec */}');
const end = txt.indexOf('        {/* Master Authority Matrix Table: Section 29 Spec */}');
const replacement = `      {/* Top Banner & Title: Section 29 Spec */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl space-y-8">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-blue-400 shadow-inner backdrop-blur-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-wide font-serif">
                  Access Control & Security
                </h1>
                <span className="px-3 py-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full shadow-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3" />
                  MASTER ADMIN / VERIFIED
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                Role authorization rules governing user account creation, profile edits, deletions, and administrative credentials.
              </p>
            </div>
          </div>

          {/* Security Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={KeyRound}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-sm backdrop-blur-sm px-4 py-2"
              onClick={() => {
                setPasswordError('');
                setPasswordSuccess('');
                setIsPasswordModalOpen(true);
              }}
            >
              Change Password
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={User}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all shadow-sm backdrop-blur-sm px-4 py-2"
              onClick={handleOpenProfileModal}
            >
              My Profile
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white border-none shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all px-4 py-2"
              onClick={handleOpenCreateUser}
            >
              Create New User
            </Button>
          </div>
        </div>

        {/* 4 Authority Summary Cards */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Card 1: ACTIVE SESSION */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                ACTIVE SESSION
              </span>
              <div className="text-base font-bold text-white mt-1.5 capitalize group-hover:text-blue-300 transition-colors">
                {currentUser?.first_name
                  ? \`\${currentUser.first_name} \${currentUser.last_name || ''}\`.trim()
                  : currentUser?.username || 'Master Administrator'}
              </div>
              <div className="text-xs text-blue-400 font-mono mt-1 opacity-80">@{currentUser?.username}</div>
            </div>
            <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Security Level:</span>
              <span className="px-2 py-1 text-[10px] font-bold text-white bg-white/10 border border-white/20 rounded-lg">
                MASTER ADMIN
              </span>
            </div>
          </div>

          {/* Card 2: CREATE USERS & ADMINS */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider">CREATE USERS</span>
              <UserPlus className="w-5 h-5 text-emerald-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
            <div className="text-sm font-bold text-white mt-1">Full Provisioning</div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed opacity-80">
              Only Master Admin can create: Master Admin, Admin / Simple Admin, Manager, and Staff.
            </p>
          </div>

          {/* Card 3: EDIT & UPDATE PROFILES */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider">EDIT PROFILES</span>
              <Edit3 className="w-5 h-5 text-blue-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
            <div className="text-sm font-bold text-white mt-1">All Accounts</div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed opacity-80">
              Modify account details, contact information, branch assignments, roles, permissions, and shifts.
            </p>
          </div>

          {/* Card 4: DELETE ACCOUNTS & RECORDS */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all duration-300 group">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[10px] uppercase font-bold tracking-wider">DELETE ACCOUNTS</span>
              <Trash2 className="w-5 h-5 text-rose-400 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            </div>
            <div className="text-sm font-bold text-white mt-1">Permanent Deletions</div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed opacity-80">
              Restricted for normal users. Only Master Admin can perform permanent deletions.
            </p>
          </div>
        </div>
      </div>
\n`;
if (start !== -1 && end !== -1) {
  txt = txt.substring(0, start) + replacement + txt.substring(end);
  fs.writeFileSync('src/pages/UserRolesPage.jsx', txt);
} else {
  console.log("NOT FOUND", start, end);
}
