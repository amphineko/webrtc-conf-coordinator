using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class IndexModel : IndexModelBase
    {
        public IndexModel(ApplicationDbContext context) : base(context)
        {
        }

        public async Task OnGetAsync(int? pageIndex)
        {
            var query = Context.RtcSessions
                .Where(session => !session.Deleted)
                .Where(session => session.Public)
                .OrderByDescending(session => session.CreationTime);

            SessionCount = await query.CountAsync();
            if (SessionCount == 0)
            {
                Sessions = new List<RtcSession>();
                return;
            }

            PageCount = (int) Math.Ceiling((decimal) SessionCount / PageSize);
            PageIndex = Math.Clamp(1, pageIndex ?? 1, PageCount);

            Sessions = await query.Skip((PageIndex - 1) * PageSize).Take(PageSize).ToListAsync();
        }
    }
}