// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.

jQuery(document).ready(function() {
    jQuery.timeago.settings.allowFuture = true;
    jQuery.timeago.settings.allowPast = true;

    jQuery("time.time-ago").timeago();
})