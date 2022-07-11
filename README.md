SitePassword
============

SitePassword is a Chrome extension and a web page that 
calculates your passwords from a master password, your 
userid at the site, and your nickname for the site.  One 
click on the password field fills in the login form for 
you.  That makes your life simpler.  You don't even need 
to remember your userid, just one password for all your 
sites.  SitePassword is also a web page, 
https://sitepassword.alanhkarp.com, that allows you to get 
your passwords when you're not on a machine that has the 
extension installed.

SitePassword also makes you safer.  It produces a different, 
very strong password for each site.  It also remembers which 
domain name is associated with your site information and warns 
you if you might be at a phishing site.

[Overview](#overview)
---------------------

It's too hard for you to remember a strong password for every site you use. Password managers take care of this problem for you. Most of them store your passwords in encrypted form, either on your machine or in the cloud.

SitePassword is different. It calculates your password for the site from a single master password and your nickname and username (userid) for the site. That means you can get your password if you remember those three things. Just come to [SitePassword](https://sitepassword.alanhkarp.com) and fill in the form. There is also an extension for the Chrome browser that you can install.

[Common Features](#common)
--------------------------

Using the [SitePassword](https://sitepassword.alanhkarp.com) web page to compute a password is similar to the way you use the Chrome extension. In both cases, you fill in your master password, nickname and user name for the site, and your password for the site is calculated for you. The differences are described in later sections.

Some web sites have strict password rules, how long it must be, if it must contain upper case or lower case letters, numbers, or special characters, including restrictions on which special characters are allowed. If you run into a site that doesn't accept the calculated password, click the _More_ button and change the appropriate menu entries. SitePassword was tested on 100s of web sites to make sure it can always compute a valid password.

Some sites make you change your password periodically. SitePassword makes that easy. Just change your nickname for the site. For example, if your current nickname is _MyBank2021_, and they make you change your password once a year, you could change the nickname to _MyBank2022_. Your new site password will be completely different from the old one.

SitePassword includes an antiphishing feature. If you try to use the same nickname for another domain name, you will get a big, scary warning. It's telling you that you may be at a site spoofing the one you think you are at. Unfortunately, you will also see this warning when you are not being tricked. Many websites have several different login pages with different domain names. So, when you see the warning, check the URL of the page to make sure it's a login page for the site you think it is.

Since SitePassword doesn't store your passwords, there's no way you can use your existing passwords with it. You will have to use the web site's _Change Password_ or _Forgot Password_ feature on sites where you already have accounts.

[Using the Chrome Extension](#extension)
----------------------------------------

After you install the Chrome extension and visit a page with a password field, you'll see that it tells you to _Click SitePassword_. When you click on the SitePassword icon, you'll see a form like the one at [SitePassword](https://sitepassword.alanhkarp.com) with the Domain Name field filled in. Enter your master password, an easy to remember nickname for the site and your user name for the site. You will see your site password being calculated as you type. Mouse over to the site's password field, which now should tell you to _Click here for password_. Click, and your password gets filled in.

When you reload the page, you'll see your user name filled in and instructions to _Click here for password_. If it says, _Click SitePassword_, you will have to enter your master password again. That's because SitePassword never stores your master password; it only remembers it for the duration of your browser session.

If you go to the same web page on a different machine which you synchronize bookmarks with, you'll see your nickname and user name for the site filled in for you. That's because the extension stores your settings in a bookmark folder called _SitePasswordData_. The extension uses the bookmarks with numeric titles, _e.g.,_ "0", "1"_, etc_. The bookmarks with domain names for titles are for use on [SitePassword](https://sitepassword.alanhkarp.com).

Some pages have more than one password field, such as those for creating an account or changing your password. In those cases, you may see instructions to _Paste your password here_. SitePassword has already put your site password on the clipboard and will remove it in a minute.

SitePassword is able to find the password field on all of the hundreds of sites it's been tested on. If the instructions don't show up in the site's password field, and holding the mouse over it for a few seconds doesn't show a popup with the instructions, try clicking a blank spot on the page. If that doesn't work you can always click the SitePassword icon and manually copy your site password to the clipboard.

If you click the _More_ button, you'll see and _Instructions_ button. Clicking it will take you to this page.

There is a _Download Site Data_ button at the bottom of the page. Clicking it lets you save your settings in a file you can reference if you're at a machine that doesn't have your SitePassword settings. This data doesn't contain anything that would seriously compromise your security if it got exposed, but you shouldn't publish it widely.

[Using the SitePassword Web Page](#webpage)
-------------------------------------------

The SitePassword [web page](sitepassword.alanhkarp.com) can use bookmarks created by the extension to automate filling in the form. Simply find the appropriate bookmark in the SitePasswordData bookmark folder, and paste it into the top field on the form. You will see the domainname, site name, and user name fields get filled in. If you would like to skip this step in the future on this machine, click the _Remember_ button.

You can paste the site's domain name into the form. Your site name and user name will be filled in if you had clicked the _Remember_ button earlier for this domain name.

There is a _Download Local Data_ button at the bottom of the page. Clicking it lets you save your settings in a file you can reference if you're at a machine that doesn't have your SitePassword settings. **Only settings for sites you've chosen to remember on this machine will be included.**

[Voluntary Payment](#payment)
-----------------------------

If you like SitePassword, please make a contribution to the [Internet Archive](https://archive.org/donate?origin=iawww-TopNavDonateButton) or your favorite charity.