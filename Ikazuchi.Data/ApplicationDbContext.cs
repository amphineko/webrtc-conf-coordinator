using System;
using IdentityServer4.EntityFramework.Options;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Ikazuchi.Data
{
    public class ApplicationDbContext : ApiAuthorizationDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            IOptions<OperationalStoreOptions> operationalStoreOptions)
            : base(options, operationalStoreOptions)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            // inherits from identity
            base.OnModelCreating(builder);

            // apply configurations from current assembly
            builder.ApplyConfigurationsFromAssembly(GetType().Assembly);
        }

        public DbSet<RtcSession> RtcSessions { get; set; }

        public DbSet<RtcSessionGrant> RtcSessionGrants { get; set; }

        public DbSet<RtcSessionInvite> RtcSessionInvites { get; set; }
    }
}