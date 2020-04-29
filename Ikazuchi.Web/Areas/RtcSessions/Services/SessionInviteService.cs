using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
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
    public class SessionInviteService
    {
        private readonly ApplicationDbContext _context;

        private static readonly RNGCryptoServiceProvider Random = new RNGCryptoServiceProvider();

        public SessionInviteService(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
        }

        private static uint GenerateInviteId()
        {
            var buffer = new byte[4];
            Random.GetNonZeroBytes(buffer);
            return BitConverter.ToUInt32(buffer);
        }

        public async Task<uint> CreateAsync(RtcSession session, ApplicationUser creator, uint expires)
        {
            var recent = await GetActiveAsync(session.Id, creator.Id);
            if (recent != null)
                recent.Disabled = true;

            var inviteId = GenerateInviteId();
            await _context.AddAsync(new RtcSessionInvite
            {
                Creator = creator,
                Disabled = false,
                Expires = DateTime.Now.AddMinutes(expires),
                Id = inviteId,
                Session = session
            });

            await _context.SaveChangesAsync();

            return inviteId;
        }

        public Task<RtcSessionInvite> GetActiveAsync(Guid sessionId, Guid userId) => (
                from invite in _context.RtcSessionInvites
                where invite.Creator.Id == userId && invite.Disabled == false && invite.Session.Id == sessionId
                select invite)
            .FirstOrDefaultAsync();
    }
}