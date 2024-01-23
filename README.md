[Overview](#overview)
---------------------

It's too hard for you to remember a different strong password for every site
you use. Password managers take care of this problem for you. Most
of them store your passwords in encrypted form, either on your
machine or in the cloud.

SitePassword is different. Instead of
storing your passwords, it calculates them from a single super password
and your nickname and user name
for the site. That means you can usually get your password if
you remember those three things. (Some web pages require additional
settings.) SitePassword automatically saves your settings, so
you don't have to remember them.

Clicking the circled "i" icon on the SitePassword window opens these
instructions.

[Using the Extension](#basic)
---------------------------------------

After you install the Chrome extension and visit a page with a
login form, you'll see that the password field tells you to
*Click SitePassword*. When you click on the SitePassword
icon, you'll see a form with the domain name field filled in.
Enter your super password, an easy to remember nickname for the
site, and your user name for the site. You will see your site
password being calculated as you type. 

Mouse over to the login page's password field, which now should tell you to
*Click here for password*. Click, and your password gets
filled in. When you reload the page from any machine you synchronize bookmarks
with that has the extension installed, you'll see your user name filled in and
instructions to *Click here for password*. Click, and your
password gets filled in. 

You will have to enter your super password each time you start your 
browser.  That's because SitePassword never stores your
super password; it only remembers it for the duration of your
browser session. If your settings aren't there when you think they
should be, reloading the page with the login form will solve the
problem.  

[The Domain Name](#domainname)
---------------------------------------

The domain name is associated with the settings for this account.
It is also the name of a bookmark in the SitePasswordData bookmark folder.
That's the bookmark you can use to get your settings when you're on a machine
that doesn't have the SitePassword extension installed.

You may have more than one domain name for a given account because some web sites
use more than one domain name for logging into that account. You'll get the same password
for all of the domain names as long as they are all associated with the same nickname.

You can forget this domain name
and all settings associated with it by clicking the Forget menu icon or by deleting the bookmark.

[Your Super Password](#superpassword)
---------------------------------------

You should choose a strong super password, one with upper and
lower case letters, numbers, and special characters. The stronger
the better. The reason is simple. A bad guy who knows one site
password and can guess your nickname and user name for that site
can start guessing super passwords. You want to make that job has
hard as you can.

You can protect yourself further by using different super passwords
for different kinds of accounts. You could have one that you use for
banking, another for subscriptions, and a third for sites you find
sketchy.

SitePassword doesn't prevent you from using a weak super password,
but it does warn you. There is a strength indicator directly above
the super password field. It uses a meter, words, and color to
let you know how strong your super password is.

SitePassword cannot retrieve your super password. You should make
sure it's something you won't easily forget. You might even want
to write it down and keep the copy in a secure place.

[Your Site Nickname](#sitename)
---------------------------------------

Your nickname is the way you refer to this account. It should be easy to remember,
such as 'amazon' for amazon.com, but it doesn't have to be that simple.

Your additional settings,
such as the site password length and whether your
site password contains special characters are associated with this nickname.

[Changing a Site Password](#changing-a-site-password)
tells you how to do that.

[Your User Name](#username)
---------------------------------------

Your user name is the name you use to log in to the site. It is
associated with the nickname for the account and is used to 
calculate your site password.  That means you can only have a 
single user name for a given nickname.  If you want to use different 
user names for the same site, follow the instructions for 
<span id="sharedref"><a href="#sharedinfo">Shared Machines</a></span>.   

SitePassword will attempt to fill in the userid field of a login form. If you
don't see it, one of a few things happened.

- You never provided your settings for this domain name.</li>

    - This is the first time you've used SitePassword for this account.</li>
    - This is a different domain name for logging into the same account.</li>
    - You are at a fake site that is trying to steal your password.</li>

- SitePassword incorrectly guessed the location of the userid field.</li>
- SitePassword couldn't find the userid field.</li>

In the last two cases,
you'll have to fill in your userid manually, which you can do by copying 
it to the clipboard using the Copy menu icon in the userid field.


[Your Site Password](#sitepw)
--------------------------

You only need to open SitePassword to enter your super password, to 
set up a new site, or when you need to paste your password.  
Most of the time, you can just click on the login 
form's password field.  You'll know which to do because the password field will 
say either *Click SitePassword* or *Click here for password*.  If the 
password field says neither, just click on the password field and see if
your password was filled in.  If it wasn't, you should see
an alert telling you to open SitePassword.  If 
neither of those happens, SitePassword could not find the password field.
In that case, open SitePassword and copy your site password to the clipboard.

SitePassword could generate a weak site password just by chance.  To 
let you know that has happened, it uses the same colors that 
appear in the super password 
strength meter to tell you how strong your site password is. 
For example, if your site password is orange, then it is weak. 
In that case, just choose a different nickname for the site.

When SitePassword can't generate a password acceptable to the site, it can remember a password 
you provide.  This password is stored in your settings encrypted with the computed
password for the site as a key.  That means you must fill in the form before entering 
your password. After you fill in the form, open the setttings and
click the <em>Provide your own site password</em> 
check box.  You can then enter your password into the site password field. 

You can also get your passwords without the extension. Go to
[SitePassword.info](https://sitepassword.info) or 
[the page on Github](https://alanhkarp.github.io/SitePasswordWeb) and fill in the form.  

[Input Field Menus (3 Blue Dots)](#menus)
--------------------------

Each of the input fields has a menu that shows up when you mouse over 
(or tap on a touchscreen) the 3 dots in the right side of the field.  Each field has a particular set of menu items.  If an icon is grayed out, it is not available for that field.  For example, you can't show your super password if the field is empty.

<img src="src/help.png" alt="help" style="width: 16px; height: 16px; vertical-align: middle;"/> &nbsp; 
Every field has a help option, 
which provides a brief summary of the information provided in these Instructions.

<img src="src/forget.png" alt="forget" style="width: 16px; height: 16px; vertical-align: middle;"/> &nbsp;
The domain name, sitename and username fields have a Forget option.  For example, if you click this icon in the site nickname 
field, you will be given the opportunity to permanently forget the settings for all domain names associated 
with that site nickname.

<svg class="icon menu-icon" xmlns="http://www.w3.org/2000/svg" fill="none" style="top: 7px" width="24" height="24">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 5v0a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v0M8 5v0a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v0" />
</svg> The username and site password fields have a Copy option, which copies the contents of the field to the clipboard.

<svg class="icon menu-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" style="top: 7px" width="24" height="24">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="M7 6.362A9.707 9.707 0 0 1 12 5c6.307 0 9.367 5.683 9.91 6.808.06.123.06.261 0 .385-.352.728-1.756 3.362-4.41 5.131M14 18.8a9.93 9.93 0 0 1-2 .2c-6.307 0-9.367-5.683-9.91-6.808a.44.44 0 0 1 0-.386c.219-.452.84-1.632 1.91-2.885m6 .843A3 3 0 0 1 14.236 14M3 3l18 18" />
</svg>
<svg class="icon menu-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" style="top: 7px" width="24" height="24">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="M12 5c-6.307 0-9.367 5.683-9.91 6.808a.435.435 0 0 0 0 .384C2.632 13.317 5.692 19 12 19s9.367-5.683 9.91-6.808a.435.435 0 0 0 0-.384C21.368 10.683 18.308 5 12 5z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
    stroke-width="2" />
</svg> The super and site password fields give you the option of showing or hiding the contents of the field.
By default, your super password is hidden, and your site password is not.  You can change the default behavior of 
the site password field by clicking the <em>Hide site password by default</em> option in the settings panel.

[Additional Settings](#settings)
--------------------------

The settings panel has a number of options divided
into two sections.  The first section is about your super and site passwords.
The second section controls how SitePassword computes your site password.
Click on the 
<svg class="menu-icon" width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    fill="none">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="M14 21h-4l-.551-2.48a6.991 6.991 0 0 1-1.819-1.05l-2.424.763-2-3.464 1.872-1.718a7.055 7.055 0 0 1 0-2.1L3.206 9.232l2-3.464 2.424.763A6.992 6.992 0 0 1 9.45 5.48L10 3h4l.551 2.48a6.992 6.992 0 0 1 1.819 1.05l2.424-.763 2 3.464-1.872 1.718a7.05 7.05 0 0 1 0 2.1l1.872 1.718-2 3.464-2.424-.763a6.99 6.99 0 0 1-1.819 1.052L14 21z" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" />
</svg> icon to open the settings panel and the <svg class="menu-icon" width="16px" height="16px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
    fill="none">
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="M14 21h-4l-.551-2.48a6.991 6.991 0 0 1-1.819-1.05l-2.424.763-2-3.464 1.872-1.718a7.055 7.055 0 0 1 0-2.1L3.206 9.232l2-3.464 2.424.763A6.992 6.992 0 0 1 9.45 5.48L10 3h4l.551 2.48a6.994 6.994 0 0 1 1.819 1.05l2.424-.763 2 3.464-1.872 1.718a7.05 7.05 0 0 1 0 2.1l1.872 1.718-2 3.464-2.424-.763a6.992 6.992 0 0 1-1.819 1.052L14 21z" />
    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
    d="m9 12 2 2 4-4" />
</svg>
icon to close it.  

The top section of the settings panel has three settings related to your super and site passwords.  

Unlike most password managers that calculate your password, SitePassword gives you
the option to provide your own.  This is useful if you have a password that you
can't change, such as one provided by your employer.  You can also use this option
if SitePassword can't compute a password acceptable by the site. 

The password you 
provide is encrypted with the computed site password as a key.  That means you must 
fill in the form before entering your password.  After you fill in the form, open the
settings and check the <em>Provide your own site password</em> check box.
You'll then be able to enter your password into the site password field.

You normally leave your super password in the form, but you might not want to do 
that on a shared machine.  Check the <em>Clear super password on use</em> to clear 
your super password every time you use the calculated site password.  You'll have to
enter your super password every time you use SitePassword.

Your site password is not hidden by default for two reasons.  One is that it helps 
see how different the site password are for different inputs.  The second is that it's fun watching
the site password change as you type in the form.  Check the <em>Hide site password
by default</em> to hide it.

The next section controls how SitePassword computes your site password and is 
explained in <span id="acceptableref"><a href="#acceptableinfo">Computing an Acceptable Password</a></span>.

The <em>Download site data</em> button is explained in 
<span id="downloadref"><a href="#downloadinfo">Downloading Your Settings</a></span>, and the
<em>Export passwords</em> button, in <span id="exportref"><a href="#exportinfo">Exporting Your Passwords</a></span>.

[Computing an Acceptable Password](#acceptable)
--------------------------

Some web sites have strict password rules, how long it must be,
if it must contain upper case or lower case letters, numbers, or
special characters, including restrictions on which special
characters are allowed. If you run into a site that doesn't
accept the calculated password, click the gear icon,
and change the appropriate menu entries. SitePassword
was tested on hundreds of web sites to make sure it can always
compute a valid password.

The defaults 
were chosen because SitePassword can calculate a password that is acceptable to most
sites with them.  You can change these settings if you run into a site that doesn't accept the
calculated password. 

Although these settings produce valid passwords for most sites, you might feel more comfortable generating
stronger site passwords by making them longer or by including special characters.  Click
<em>Save as default</em> to make these settings the default for all new accounts.


[Changing a Site Password](#change)
--------------------------

Some sites make you change your password periodically. SitePassword
makes that easy. Just change your nickname for the site. For example,
if your current nickname is *MyBank1*, and they make you change
your password once a year, you could change the nickname to
*MyBank2*.  Your new site password will be completely different
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
changing its icon when you use the clipboard icon.  SitePassword will 
change the icon back if you copy something to the clipboard on the 
assumption that you didn't just copy your site password.  You can also reset 
the warning by using the SitePassword *Clear Clipboard* button. 

[Phishing](#phishing)
--------------------------

SitePassword includes an antiphishing feature. If you try to use
the a nickname you previously used for a different domain name, you will get a big,
scary warning. It's telling you that you may be at a site
spoofing the one you think you are at. Unfortunately, you will
also see this warning when you are not being tricked. Many
websites have several different login pages with different domain
names for the same account. So, when you see the warning, check the URL in the warning message
to make sure it's a login page for the site you think it is.

[Synchronizing across Your Machines](#sync)
--------------------------

If you go to the same login page on a different machine that you
synchronize bookmarks with and that has the extension installed, you'll see your user name
for the site filled in for you. That's because the extension
stores your settings in a bookmark folder called
*SitePasswordData*. The extension uses the bookmark named
*CommonSettings* for its own use. The
bookmarks with domain names for titles are cam be used on the 
[SitePassword.info](https://sitepassword.info) page.

[The Extension and the Web Page](#extension)
--------------------------

There will be times when you are on a device that doesn't have 
SitePassword installed, such as at a friend's house or on a mobile 
device.  You can still get your passwords by going to 
[sitepassword.info](https://sitepassword.info) or 
[the page on Github](https://alanhkarp.github.io/SitePasswordWeb).  
If you have synched your bookmarks to the device you are 
using, you can paste the appropriate bookmark into the form to 
get your settings for the site.

See the instructions on the [sitepassword.info](https://sitepassword.info) web page for more information.

[Shared Machines](#shared)
--------------------------

Many households have one machine shared by everybody. It's likely that everyone 
uses the same user name and password for certain sites, such as streaming services. 
It's also likely that those people use their individual usernames and passwords for 
other sites, such as social media.

SitePassword accomodates those uses with a feature provided by your browser called *profiles*. 
Since each profile gets its own bookmarks, create one profile for the shared account and 
one for each individual user.

[Downloading Your Settings](#download)
--------------------------

There is a <em>Download Site Data</em> button at the bottom of
the popup window after you click the gear icon.
Clicking this button lets you save your settings in a file you
can reference if you need to look them up.  All settings created on machines that 
synch your bookmarks are included.

[Exporting Your Passwords](#export)
--------------------------

There may come a time when you want to use a different password manager.
In that case you can use the <em>Export passwords</em> button at the bottom of
the settings.
Clicking this button creates a file with your passwords.  You can see a readable form 
of the data in the file by opening it in a spreadsheet.
 
<b>Be very careful with this file.</b>  Completely delete it from your machine, including
emptying the trash, after you use it.  If you don't, anyone who gets access to your machine
can get your passwords.

[Source Code](#source)
----------------------

If you are worried that SitePassword might go away, you can download the source code 
for the extension from the [SitePassword](https://github.com/alanhkarp/SitePassword) 
project and that of the web page from the [SitePasswordWeb](https://github.com/alanhkarp/SitePasswordWeb) 
project. (For historical reasons, these are separate projects with a lot of duplicated code.)

[Voluntary Payment](#payment)
-----------------------------

If you like SitePassword, please make a contribution to the [Nancy Lee Hurtt '70 Maryland Promise Scholarship](https://giving.umd.edu/giving/fund.php?name=nancy-lee-hurtt-70-maryland-promise-scholarship) or your favorite charity.

[Developers](#developers)
-----------------------------

The SitePassword extension can be installed for Firefox, Safari, and most Chromium browsers
using the code here.  Simply rename the appropriate manifest file to manifest.json, and 
install the extension using the mechanism provided by your browser.

You may find a need to debug the extension.  The service worker, bg.js, and the content script, findpw.js, work normally, but the popup, ssp.js, won't stop at breakpoints hit early in its startup.  Setting the constant *debugMode* to true will make the poup stop at a *debugger* statement early in the load process.

A number of tests are included with the distribution.  In keeping with the
philosophy of avoiding dependencies, the tests don't use any frameworks.  To run the tests, edit bg.js and set the constant *testMode* to true.  Then reload the extension.  Go to a new page, and Inspect the popup.  You'll get an alert that tests are running to make it harder for you to forget to turn off testing.  Test results appear on the console.