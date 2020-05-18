using System;
using System.Collections.Generic;
using System.Reflection;
using Ikazuchi.Abstractions;
using Ikazuchi.Data;
using Ikazuchi.Data.Models.Users;
using Ikazuchi.Signaling;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Ikazuchi.Web
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        private void ConfigureComponent(Type type, ICollection<Type> typeCache, IServiceCollection services)
        {
            typeCache.Add(type);

            var attribute = type.GetCustomAttribute<ComponentAttribute>();
            if (attribute == null)
                return;

            foreach (var ctor in type.GetConstructors())
            foreach (var paramInfo in ctor.GetParameters())
                if (!typeCache.Contains(paramInfo.ParameterType))
                    ConfigureComponent(paramInfo.ParameterType, typeCache, services);

            var descriptor = ServiceDescriptor.Describe(attribute.ServiceType ?? type, type, attribute.Lifetime);
            services.Add(descriptor);
        }

        private void ConfigureComponents(Assembly assembly, ICollection<Type> typeCache, IServiceCollection services)
        {
            foreach (var type in assembly.GetTypes())
                ConfigureComponent(type, typeCache, services);
        }

        public void ConfigureServices(IServiceCollection services)
        {
            services.AddOptions();

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options
                    .UseLazyLoadingProxies()
                    .UseNpgsql(
                        Configuration.GetConnectionString("DefaultConnection"),
                        builder => { builder.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName); }
                    );
            });

            var typeCache = new HashSet<Type>();
            ConfigureComponents(typeof(GatewayController).Assembly, typeCache, services);
            ConfigureComponents(Assembly.GetExecutingAssembly(), typeCache, services);

            services
                .AddDefaultIdentity<ApplicationUser>(options => options.SignIn.RequireConfirmedAccount = true)
                .AddEntityFrameworkStores<ApplicationDbContext>();

            services.AddControllersWithViews();
            services.AddRazorPages(options =>
            {
                options.Conventions
                    .AuthorizeAreaFolder("RtcSessions", "/")
                    .AllowAnonymousToAreaPage("RtcSessions", "/Index")
                    .AllowAnonymousToAreaPage("RtcSessions", "/Invite/Accept");
            });

            services.AddSignalR();
        }

        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                app.UseDatabaseErrorPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/GeneralError");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapHub<GatewayController>("/Gateway");
                endpoints.MapRazorPages();
                endpoints.MapControllerRoute("areas", "{area:exists}/{controller}/{action}/{id?}");
                endpoints.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
            });

            app.Map("/Client", app =>
            {
                app.UseStaticFiles();

                app
                    .Use(async (context, next) =>
                    {
                        if (context.User.Identity.IsAuthenticated)
                        {
                            await next();
                            return;
                        }

                        context.Response.Redirect("/Identity/Account/Login");
                    })
                    .Use(async (context, next) =>
                    {
                        context.Request.Path = "/Client" + context.Request.Path;
                        await next();
                    })
                    .UseSpa(builder =>
                    {
                        builder.Options.SourcePath = "Client";

                        if (env.IsDevelopment()) builder.UseProxyToSpaDevelopmentServer("http://127.0.0.1:13900/");
                    });
            });
        }
    }
}