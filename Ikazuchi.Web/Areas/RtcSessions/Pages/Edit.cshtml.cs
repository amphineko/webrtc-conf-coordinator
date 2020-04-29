using System;
using System.Threading.Tasks;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Web.Areas.RtcSessions.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class EditModel : PageModel
    {
        private readonly Data.ApplicationDbContext _context;

        private readonly UserManager<ApplicationUser> _userManager;

        public EditModel(Data.ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public RtcSession Session { get; set; }

        [BindProperty] public SessionEditForm Form { get; set; }

        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (id == null)
                return NotFound();

            Session = await _context.RtcSessions
                .Include(t => t.Creator)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (Session == null)
                return NotFound();

            if (Session.Creator != await _userManager.GetUserAsync(User))
                return Unauthorized();

            Form = new SessionEditForm()
            {
                Description = Session.Description,
                Id = Session.Id,
                Title = Session.Title,
                Visibility = Session.Public ? SessionVisibility.Public : SessionVisibility.Private
            };

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
                return Page();

            var session = await _context.RtcSessions
                .Include(t => t.Creator)
                .FirstOrDefaultAsync(t => t.Id == Form.Id);

            if (session.Creator != await _userManager.GetUserAsync(User))
                // TODO: allow admin to edit
                return Unauthorized();

            session.Description = Form.Description;
            session.Public = Form.Visibility == SessionVisibility.Public;
            session.Title = Form.Title;

            await _context.SaveChangesAsync();

            return RedirectToPage("./Details", new {id = session.Id});
        }
    }
}