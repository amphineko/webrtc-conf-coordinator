using System.Collections.Generic;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class IndexModelBase : PageModel
    {
        public IndexModelBase(ApplicationDbContext context)
        {
            Context = context;
        }

        public const int PageSize = 10;

        protected ApplicationDbContext Context { get; }

        public int PageCount;

        public int PageIndex;

        public int SessionCount;

        public IList<RtcSession> Sessions { get; set; }
    }
}