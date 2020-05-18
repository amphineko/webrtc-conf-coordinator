using System.Threading.Tasks;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Web.Areas.RtcSessions.Services;
using Ikazuchi.Web.Common;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages.Invite
{
    public class AcceptModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly SessionGrantService _grantService;
        private readonly UserManager<ApplicationUser> _userManager;

        public AcceptModel(
            ApplicationDbContext context,
            SessionGrantService grantService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _grantService = grantService;
            _userManager = userManager;
        }

        public RtcSessionInvite Invite { get; set; }

        public bool Joined { get; set; }

        public RtcSession Session { get; set; }

        public string Token { get; set; }

        public async Task<IActionResult> OnGet(string token)
        {
            if (token == null)
                return BadRequest("No invite token provided");

            Token = token;

            if (!Base58Encoding.TryDecode(token, out var bigId))
                return BadRequest("Invalid Invite Code Format");
            if (bigId <= 0 || bigId >= uint.MaxValue)
                return BadRequest("Invalid Invite Code Value");

            var invite = await _context.RtcSessionInvites
                .Include(v => v.Creator)
                .Include(v => v.Session)
                .FirstOrDefaultAsync(v => v.Id == (uint) bigId);

            if (invite == null)
                return NotFound();

            Invite = invite;
            Session = invite.Session;

            var user = await _userManager.GetUserAsync(User);
            Joined = user != null && await _grantService.Exists(invite.Session.Id, user.Id);

            return Page();
        }

        public async Task<IActionResult> OnPost(uint inviteId)
        {
            if (inviteId <= 0 || inviteId >= uint.MaxValue)
                return BadRequest("Invite Id out of range");

            var invite = await _context.RtcSessionInvites
                .FirstOrDefaultAsync(v => v.Id == inviteId);
            if (invite == null)
                return NotFound("Invite not found");

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            await _grantService.Create(invite.Session, user);

            return RedirectToPage("/Details", new {area = "RtcSessions", id = invite.Session.Id});
        }
    }
}