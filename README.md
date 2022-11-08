[Overview](#overview)
---------------------

It's too hard for you to remember a strong password for every site
you use. Password managers take care of this problem for you. Most
of them store your passwords in encrypted form, either on your
machine or in the cloud.

SitePassword is different from most password managers. Instead of
storing your passwords, it calculates them from a single master password
and your nickname and user name
for the site. That means you can usually get your password if
you remember those three things. (Some web pages require additional
settings.) SitePassword automatically saves your settings, so
you don't have to remember them.

The <svg width="12px" height="12px" viewBox="2 1 20 20" xmlns="http://www.w3.org/2000/svg"
    fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-linecap="round"
        stroke-linejoin="round" stroke-width="2" />
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M12 15v-3m0-3v0" />
</svg> icon on the SitePassword window opens these
instructions.

[Using the Extension](#basic)
---------------------------------------

After you install the Chrome extension and visit a page with a
login form, you'll see that the password field tells you to
*Click SitePassword*. When you click on the SitePassword
icon, you'll see a form with the domain name field filled in.
Enter your master password, an easy to remember nickname for the
site and your user name for the site. You will see your site
password being calculated as you type. 

Mouse over to the site's password field, which now should tell you to
*Click here for password*. Click, and your password gets
filled in. When you reload the page, you'll see your user name filled in and
instructions to <em>Click here for password</em>. Click, and your
password gets filled in. 

You will have to enter your master password each time you start your 
browser.  That's because SitePassword never stores your
master password; it only remembers it for the duration of your
browser session. If your settings aren't there when you think they
should be, reloading the page with the login form will solve the
problem.  

There may be a time when you want to forget the settings for a
particular domain name. Maybe you cancelled your account at the
site and want to use the site name for another one. Or, maybe
you inadverently accepted a phishing site. You can forget the
settings by clicking on SitePassword and clearing the site
name field.


[Your Master Password](#masterpassword)
---------------------------------------

You should choose a strong master password, one with upper and
lower case letters, numbers, and special characters. The stronger
the better. The reason is simple. A bad guy who knows one site
password and can guess your nickname and user name for that site
can start guessing master passwords. You want to make that job has
hard as you can.

SitePassword doesn't prevent you from using a weak master password,
but it does warn you. There is a strength indicator directly below
the master password field. It uses a meter, words, and color to
let you know how strong your master password is.

SitePassword cannot retrieve your master password. You should make
sure it's something you won't easily forget. You might even want
to write it down and keep the copy in a secure place.


[Your Site Passwords](#site)
--------------------------

You only need to open SitePassword to enter your master password or to 
set up a new site.  Most of the time, you can just click on the login 
form's password field.  You'll know which to do because the password field will 
say either *Click SitePassword* or *Click here for password*.  

SitePassword could generate a weak site password just by chance.  
To let you know that has happened, it uses the same colors that 
appear in the master password 
strength meter to tell you how strong your site password is. For example, if your site password is orange, then it is weak. In that case, just choose a different nickname for the site.

Since SitePassword doesn't store your passwords, there's no way
you can use your existing passwords with it. You will have to use
the web site's *Change Password* or
*Forgot Password*
feature on sites where you already have accounts.

You can also get your passwords without the extension. Go to
[SitePassword.info](https://sitepassword.info) or 
[the page on Github](https://alanhkarp.github.io/SitePasswordWeb)and fill in the form.

[Computing an Acceptable Password](#acceptable)
--------------------------

Some web sites have strict password rules, how long it must be,
if it must contain upper case or lower case letters, numbers, or
special characters, including restrictions on which special
characters are allowed. If you run into a site that doesn't
accept the calculated password, click 
<svg width="12px" height="12px" viewBox="2 1 20 20" xmlns="http://www.w3.org/2000/svg"
    fill="none">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M14 21h-4l-.551-2.48a6.991 6.991 0 0 1-1.819-1.05l-2.424.763-2-3.464 1.872-1.718a7.055 7.055 0 0 1 0-2.1L3.206 9.232l2-3.464 2.424.763A6.992 6.992 0 0 1 9.45 5.48L10 3h4l.551 2.48a6.992 6.992 0 0 1 1.819 1.05l2.424-.763 2 3.464-1.872 1.718a7.05 7.05 0 0 1 0 2.1l1.872 1.718-2 3.464-2.424-.763a6.99 6.99 0 0 1-1.819 1.052L14 21z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
</svg> and change the appropriate menu entries. SitePassword
was tested on hundreds of web sites to make sure it can always
compute a valid password.


[Changing a Site Password](#change)
--------------------------

Some sites make you change your password periodically. SitePassword
makes that easy. Just change your nickname for the site. For example,
if your current nickname is *MyBank2021*, and they make you change
your password once a year, you could change the nickname to
*MyBank2022*.  Your new site password will be completely different
from the old one.

[Clipboard](#clipboard)
--------------------------

There are two times when you will use the clipboard.  Although SitePassword 
finds the password field on a large number of web sites, 
there are likely some where it won't.  Your first clue that happened
is that you don't see either *Click here for password* or
*Click SitePassword* in the password field.  You'll know for 
sure that happened if neither of them shows up as a tooltip after 
holding your mouse over the site's password field for a couple of
seconds.  In that case, click on the SitePassword icon and copy 
your site password to the clipboard

The other time you'll use the clipboard is on pages that have more than 
one password field, such as those for
creating an account or changing your password. In those cases, you
may see instructions to *Paste your password here*.
Clicking on the SitePassword icon and then the clipboard icon in the
site password field will put your site password on the clipboard.

Leaving your site password on the clipboard for any length of time 
can be dangerous.  SitePassword will alert you to this danger by 
changing its icon when you use the clipboard icon.  SitePassword can't 
tell if you pasted something else to the clipboard.  However, you can reset 
the warning by using the SitePassword *Clear Clipboard* button. 

[Phishing](#phishing)
--------------------------

SitePassword includes an antiphishing feature. If you try to use
the same nickname for another domain name, you will get a big,
scary warning. It's telling you that you may be at a site
spoofing the one you think you are at. Unfortunately, you will
also see this warning when you are not being tricked. Many
websites have several different login pages with different domain
names. So, when you see the warning, check the URL in the warning message
to make sure it's a login page for the site you think it is.

[Synchronizing across Your Machines](#sync)
--------------------------

If you go to the same login page on a different machine that you
synchronize bookmarks with, you'll see your user name
for the site filled in for you. That's because the extension
stores your settings in a bookmark folder called
*SitePasswordData*. The extension uses the bookmarks with
numeric titles, *e.g., </em> "0", "1", etc*. The
bookmarks with domain names for titles are for use on the 
[SitePassword.info](https://sitepassword.info) page.

[The Extension and the Web Page](#extension)
--------------------------

There will be times when you are on a device that doesn't have 
SitePassword installed, such as at a friend's house or on a mobile 
device.  You can still get your passwords by going to 
[sitepassword.info](https://sitepassword.info) or [the page on Github](https://alanhkarp.github.io/SitePasswordWeb).  If you have synched your bookmarks to the device you are 
using, you can paste the appropriate bookmark into the form to 
get your settings for the site.

See the instructions on the [sitepassword.info](https://sitepassword.info) web page for more information.

[Downloading Your Settings](#download)
--------------------------

There is a <em>Download Site Data</em> button at the bottom of
the popup window after you click
<svg width="12px" height="12px" viewBox="2 1 20 20" xmlns="http://www.w3.org/2000/svg"
    fill="none">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M14 21h-4l-.551-2.48a6.991 6.991 0 0 1-1.819-1.05l-2.424.763-2-3.464 1.872-1.718a7.055 7.055 0 0 1 0-2.1L3.206 9.232l2-3.464 2.424.763A6.992 6.992 0 0 1 9.45 5.48L10 3h4l.551 2.48a6.992 6.992 0 0 1 1.819 1.05l2.424-.763 2 3.464-1.872 1.718a7.05 7.05 0 0 1 0 2.1l1.872 1.718-2 3.464-2.424-.763a6.99 6.99 0 0 1-1.819 1.052L14 21z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
</svg>.
Clicking this button lets you save your settings in a file you
can reference if you need to look them up.  All settings created on machines that 
synch your bookmarks are included.


[Shared Machines](#shared)
--------------------------

Many households have one machine shared by everybody. It's likely that everyone uses the same user name and password for certain sites, such as streaming services. It's also likely that those people use their individual usernames and passwords for other sites, such as social media.

SitePassword accomodates those uses with a feature provided by Google called _profiles_. Each profile gets its own bookmarks and local storage. Simply create one profile for the shared account and one for each individual.

[Source Code](#source)
----------------------

If you are worried that SitePassword might go away, you can download the source code for the extension from the [SitePassword](https://github.com/alanhkarp/SitePassword) project and that of this page from the [SitePasswordWeb](https://github.com/alanhkarp/SitePasswordWeb) project. (For historical reasons, these are separate projects with a lot of duplicated code.)

[Voluntary Payment](#payment)
-----------------------------

If you like SitePassword, please make a contribution to the [Internet Archive](https://archive.org/donate?origin=iawww-TopNavDonateButton) or your favorite charity.