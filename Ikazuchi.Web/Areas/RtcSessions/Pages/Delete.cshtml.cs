using System;
using System.Threading.Tasks;
using Ikazuchi.Data.Models.Rtc;
using Ikazuchi.Data.Models.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;

namespace Ikazuchi.Web.Areas.RtcSessions.Pages
{
    public class DeleteModel : PageModel
    {
        private readonly Data.ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public DeleteModel(Data.ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context;
            _userManager = userManager;
        }

        public RtcSession Session { get; set; }

        public async Task<IActionResult> OnGetAsync(Guid? id)
        {
            if (id == null)
                return NotFound();

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            Session = await _context.RtcSessions.FirstOrDefaultAsync(m => m.Id == id);
            if (Session == null)
                return NotFound();

            if (Session.Creator != user)
                return Unauthorized();

            return Page();
        }

        public async Task<IActionResult> OnPostAsync(Guid? id)
        {
            if (id == null)
                return NotFound();

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized();

            Session = await _context.RtcSessions.FindAsync(id);
            if (Session == null)
                return NotFound();

            if (Session.Creator != user)
                return Unauthorized();

            Session.Deleted = true;
            await _context.SaveChangesAsync();

            return RedirectToPage("./Index");
        }
    }
}