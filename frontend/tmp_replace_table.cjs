const fs = require('fs');
const path = 'c:/Users/PC/Desktop/Alaala_Inventory_System/frontend/src/pages/UserRolesPage.jsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '        {/* Master Authority Matrix Table: Section 29 Spec */}';
const endMarker = '      {/* Global Feedback Banner */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const tableReplacement = `        {/* Master Authority Matrix Table: Section 29 Spec */}
        <div className="overflow-x-auto rounded-2xl border border-slate-700/50 bg-slate-900/50 backdrop-blur-xl shadow-xl mt-8">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/80 text-slate-300">
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">System Role</th>
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">Create Users / Admins</th>
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">Edit & Update</th>
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">Delete Accounts</th>
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">Delete System Records</th>
                <th className="py-4 px-5 font-bold tracking-wider uppercase text-[10px]">Operational Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <tr className="hover:bg-slate-800/50 transition-colors bg-blue-500/10">
                <td className="py-4 px-5 font-bold text-blue-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.5)]" />
                  MASTER ADMIN
                </td>
                <td className="py-4 px-5 text-emerald-400 font-semibold">
                  Full Authority (Any Role)
                </td>
                <td className="py-4 px-5 text-emerald-400 font-semibold">
                  All Accounts & Roles
                </td>
                <td className="py-4 px-5 text-rose-400 font-semibold">
                  Permanent Account Deletion
                </td>
                <td className="py-4 px-5 text-rose-400 font-semibold">
                  Batches, Caskets & Records
                </td>
                <td className="py-4 px-5 text-slate-300">
                  Total system ownership & configuration
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-5 font-semibold text-slate-200">
                  ADMIN / SIMPLE ADMIN
                </td>
                <td className="py-4 px-5 text-slate-500">
                  No — Master Admin Only
                </td>
                <td className="py-4 px-5 text-blue-400 font-medium">
                  Staff & Managers
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted — Cannot Delete
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-400">
                  Day-to-day operations & reports
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-5 font-semibold text-slate-300">
                  MANAGER
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Self Profile Only
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-400">
                  Inventory replenishment & department supervision
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-5 font-semibold text-slate-400">
                  STAFF
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Self Password Only
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-500">
                  Restricted
                </td>
                <td className="py-4 px-5 text-slate-400">
                  Data entry, shift tracking & laundry stage advancing
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

`;
  const newContent = content.substring(0, startIndex) + tableReplacement + content.substring(endIndex);
  fs.writeFileSync(path, newContent, 'utf8');
  console.log('Success!');
} else {
  console.log('Failed to find markers: start=' + startIndex + ' end=' + endIndex);
}
