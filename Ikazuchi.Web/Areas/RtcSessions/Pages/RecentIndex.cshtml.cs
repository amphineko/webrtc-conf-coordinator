using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class RecentIndexModel : IndexModelBase
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public RecentIndexModel(ApplicationDbContext context, UserManager<ApplicationUser> userManager) : base(context)
        {
            _userManager = userManager;
        }

        public new IList<Tuple<RtcSession, RtcSessionGrant>> Sessions { get; set; }

        public async Task OnGetAsync(int? pageIndex)
        {
            var currentUser = await _userManager.GetUserAsync(User);
            Debug.Assert(currentUser != null); // protected by razor page conventions

            var query =
                from session in Context.RtcSessions
                join grant in Context.RtcSessionGrants
                    on session equals grant.Session
                orderby grant.CreationTime
                where grant.User == currentUser
                where session.Deleted == false
                select new Tuple<RtcSession, RtcSessionGrant>(session, grant);

            SessionCount = await query.CountAsync();
            if (SessionCount == 0)
            {
                Sessions = new List<Tuple<RtcSession, RtcSessionGrant>>();
                return;
            }

            PageCount = (int) Math.Ceiling((decimal) SessionCount / PageSize);
            PageIndex = Math.Clamp(1, pageIndex ?? 1, PageCount);

            Sessions = await query.Skip((PageIndex - 1) * PageSize).Take(PageSize).ToListAsync();
        }
    }
}