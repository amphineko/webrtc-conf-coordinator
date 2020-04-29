using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Web.Areas.RtcSessions.Models;
using Ikazuchi.Web.Areas.RtcSessions.Services;
using Ikazuchi.Web.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Controllers
{
    [Area("RtcSessions")]
    [Authorize]
    public class InviteController : Controller
    {
        private readonly SessionInviteService _inviteService;
        private readonly SessionGrantService _grantService;
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public uint MaxInviteExpires = 72 * 60;

        public InviteController(
            SessionInviteService inviteService,
            SessionGrantService grantService,
            ApplicationDbContext context,
            UserManager<ApplicationUser> userManager)
        {
            _inviteService = inviteService;
            _grantService = grantService;
            _context = context;
            _userManager = userManager;
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create([FromForm] int expires, [FromForm] Guid sessionId)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized("You're not logged in");
            if (!await _grantService.Exists(sessionId, user.Id))
                return Unauthorized("You're not a member of this session");

            var session = await _context.RtcSessions.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null)
                return NotFound("Session not found");
            if (expires < 0 || expires > MaxInviteExpires)
                return BadRequest("Invalid expire time");

            var _ = await _inviteService.CreateAsync(session, user, (uint) expires);

            return RedirectToPage("/Details", new {area = "RtcSessions", id = sessionId});
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete([FromForm] uint inviteId)
        {
            // lookup invite
            var invite = await _context.RtcSessionInvites.FirstOrDefaultAsync(v => v.Id == inviteId);
            if (invite == null)
                return NotFound("Invite doesn't exist");

            // access control
            var user = await _userManager.GetUserAsync(User);
            if (invite.Creator != user)
                return Unauthorized("You don't own this invite link");

            invite.Disabled = true;
            await _context.SaveChangesAsync();

            return RedirectToPage("/Details", new {area = "RtcSessions", id = invite.Session.Id});
        }

        public async Task<IActionResult> Kick([FromForm] Guid sessionId, [FromForm] Guid userId)
        {
            var grant = await _context.RtcSessionGrants
                .Where(g => g.Session.Id == sessionId)
                .Where(g => g.User.Id == userId)
                .FirstOrDefaultAsync();

            if (grant == null)
                return NotFound("Grant not found");

            var user = await _userManager.GetUserAsync(User);
            if (user == null || user != grant.Session.Creator || user != grant.User)
                return Unauthorized();

            _context.RtcSessionGrants.Remove(grant);
            await _context.SaveChangesAsync();

            if (grant.Session.Creator == user)
                return RedirectToPage("/Details", new {area = "RtcSessions", id = grant.Session.Id});

            if (grant.User == user)
                return RedirectToPage("/Index", new {area = "RtcSessions"});

            throw new NotImplementedException("You shouldn't be there");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Join([FromForm] Guid sessionId)
        {
            var session = await _context.RtcSessions
                .Where(s => s.Id == sessionId)
                .FirstOrDefaultAsync();
            if (session == null)
                return NotFound();
            if (!session.Public)
                return Unauthorized();

            var user = await _userManager.GetUserAsync(User);
            await _grantService.Create(session, user);

            return RedirectToPage("/Details", new {area = "RtcSessions", id = sessionId});
        }
    }
}