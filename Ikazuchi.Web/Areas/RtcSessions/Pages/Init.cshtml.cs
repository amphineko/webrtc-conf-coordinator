using System;
using System.Threading.Tasks;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Web.Areas.RtcSessions.Models;
using Ikazuchi.Web.Areas.RtcSessions.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class InitModel : PageModel
    {
        private readonly ApplicationDbContext _context;
        private readonly SessionGrantService _grantService;

        private readonly UserManager<ApplicationUser> _userManager;

        public InitModel(
            ApplicationDbContext context,
            SessionGrantService grantService,
            UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _grantService = grantService;
            _userManager = userManager;
        }

        [BindProperty] public SessionInitForm Form { get; set; }

        public IActionResult OnGet()
        {
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid) return Page();

            var currentUser = await _userManager.GetUserAsync(User);

            var sessionId = Guid.NewGuid();
            var entry = await _context.RtcSessions.AddAsync(new RtcSession
            {
                CreationTime = DateTime.Now,
                Creator = currentUser,
                Id = sessionId,
                Public = Form.Visibility == SessionVisibility.Public,

                Description = Form.Description,
                Title = Form.Title
            });

            await _context.SaveChangesAsync();

            await _grantService.Create(sessionId, currentUser.Id);

            return RedirectToPage("./Details", new {id = entry.Entity.Id});
        }
    }
}