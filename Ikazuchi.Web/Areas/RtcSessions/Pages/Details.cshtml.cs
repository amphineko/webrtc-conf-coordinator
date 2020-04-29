using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Web.Areas.RtcSessions.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class DetailsModel : PageModel
    {
        private readonly Data.ApplicationDbContext _context;

        private readonly SessionInviteService _inviteService;
        private readonly UserManager<ApplicationUser> _userManager;

        public DetailsModel(
            Data.ApplicationDbContext context,
            SessionInviteService inviteService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _inviteService = inviteService;
            _userManager = userManager;
        }

        public RtcSessionInvite ActiveInvite { get; set; }

        public IList<RtcSessionGrant> Grants { get; set; }

        public bool Joined { get; set; }

        public RtcSession Session { get; set; }

        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (id == null)
            {
                return NotFound();
            }

            Session = await _context.RtcSessions
                .Include(session => session.Creator)
                .FirstOrDefaultAsync(m => m.Id == id);

            if (Session == null)
            {
                return NotFound();
            }

            var user = await _userManager.GetUserAsync(User);

            // get active invite
            ActiveInvite = await _inviteService.GetActiveAsync(Session.Id, user.Id);

            // get all grants (members)
            Grants = await _context.RtcSessionGrants
                .OrderByDescending(grant => grant.CreationTime)
                .Where(grant => grant.Session.Id == Session.Id)
                .Include(grant => grant.User)
                .ToListAsync();

            Joined = Grants.Any(grant => grant.User == user);

            return Page();
        }
    }
}