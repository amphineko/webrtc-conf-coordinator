using System;
using System.Linq;
using System.Threading.Tasks;
using Ikazuchi.Abstractions;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ikazuchi.Web.Areas.RtcSessions.Services
{
    [Component(ServiceLifetime.Scoped)]
    public class SessionGrantService
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public SessionGrantService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public async Task Create(RtcSession session, ApplicationUser user)
        {
            if (await Exists(session.Id, user.Id)) // TODO: should be restricted by database
                return;

            await _context.RtcSessionGrants.AddAsync(new RtcSessionGrant()
            {
                CreationTime = DateTime.Now,
                Session = session,
                User = user
            });

            await _context.SaveChangesAsync();
        }

        [Obsolete]
        public async Task Create(Guid sessionId, Guid userId)
        {
            var session = await _context.RtcSessions.FirstAsync(s => s.Id == sessionId);
            var user = await _userManager.FindByIdAsync(userId.ToString());

            await Create(session, user);
        }

        public async Task<bool> Exists(Guid sessionId, Guid userId) =>
            await (
                from grant in _context.RtcSessionGrants
                where
                    grant.Session.Id == sessionId &&
                    grant.User.Id == userId
                select grant
            ).CountAsync() > 0;
    }
}