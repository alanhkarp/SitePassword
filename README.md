[Overview](#overview)
---------------------

It's too hard for you to remember a strong password for every site you use. Password managers take care of this problem for you. Most of them store your passwords in encrypted form, either on your machine or in the cloud.

SitePassword is different. It calculates your password for the site from a single master password and your nickname and user name for the site. That means you can get your password if you remember those three things. Just go to [SitePassword.info](https://sitepassword.info) and fill in the form. There is also an extension for the Chrome browser that you can install.

[Your Master Password](#masterpassword)
---------------------------------------

You should choose a strong master password, one with upper and lower case letters, numbers, and special characters. The stronger the better. The reason is simple. A bad guy who knows one site password and can guess your nickname and user name for that site can start guessing master passwords. You want to make that job has hard as you can.

SitePassword cannot retrieve your master password. You should make sure it's something you won't easily forget. You might even want to write it down and keep the copy in a secure place.

Since SitePassword doesn't store your passwords, there's no way you can use your existing passwords with it. You will have to use the web site's _Change Password_ or _Forgot Password_ feature on sites where you already have accounts.

[Common Features](#common)
--------------------------

Using the [SitePassword.info](https://sitepassword.info) web page to compute a password is similar to the way you use the Chrome extension. In both cases, you fill in your master password, nickname and user name for the site, and your password for the site is calculated for you. The differences are described in later sections.

Some web sites have strict password rules, how long it must be, if it must contain upper case or lower case letters, numbers, or special characters, including restrictions on which special characters are allowed. If you run into a site that doesn't accept the calculated password, click the _More_ button and change the appropriate menu entries. SitePassword was tested on 100s of web sites to make sure it can always compute a valid password.

Some sites make you change your password periodically. SitePassword makes that easy. Just change your nickname for the site. For example, if your current nickname is _MyBank2021_, and they make you change your password once a year, you could change the nickname to _MyBank2022_. Your new site password will be completely different from the old one.

SitePassword includes an antiphishing feature. If you try to use the same nickname for another domain name, you will get a big, scary warning. It's telling you that you may be at a site spoofing the one you think you are at. Unfortunately, you will also see this warning when you are not being tricked. Many websites have several different login pages with different domain names. So, when you see the warning, check the URL of the page to make sure it's a login page for the site you think it is.

[Using the Chrome Extension](#extension)
----------------------------------------

After you install the Chrome extension and visit a page with a login form, you'll see that the password field tells you to _Click SitePassword_. When you click on the SitePassword icon, you'll see a form like the one at [SitePassword.info](https://sitepassword.info) with the domain name field filled in. Enter your master password, an easy to remember nickname for the site and your user name for the site. You will see your site password being calculated as you type. Mouse over to the site's password field, which now should tell you to _Click here for password_. Click, and your password gets filled in.

When you reload the page, you'll see your user name filled in and instructions to _Click here for password_. If it says, _Click SitePassword_, you will have to enter your master password again. That's because SitePassword never stores your master password; it only remembers it for the duration of your browser session. If your settings aren't there when you think they should be, reloading the page with the login form will solve the problem.

If you go to the same web page on a different machine that you synchronize bookmarks with, you'll see your nickname and user name for the site filled in for you. That's because the extension stores your settings in a bookmark folder called _SitePasswordData_. The extension uses the bookmarks with numeric titles, _e.g.,_ "0", "1"_, etc_. The bookmarks with domain names for titles are for use on [SitePassword.info](https://sitepassword.info).

Some pages have more than one password field, such as those for creating an account or changing your password. In those cases, you may see instructions to _Paste your password here_. Clicking on the SitePassword icon and your site password will put your site password on the clipboard. After you're done pasting it, you should copy something else so your password isn't on the clipboard any longer than necessary.

SitePassword is able to find the password field on all of the more than 100 sites it's been tested on. If the instructions don't show up in the site's password field, and holding the mouse over it for a few seconds doesn't show a popup with the instructions, try clicking a blank spot on the page. If that doesn't work you can always click the SitePassword icon and manually copy your site password to the clipboard.

If you click the _More_ button, you'll see an _Instructions_ button. Clicking it will take you to this page.

You might feel uncomfortable having your master password available for your entire browser session. The _Clear master password on use_ checkbox lets you specify this behavior. Of course, you'll have to enter your master password every time you need a site password. There is also a risk to this choice; you are more likely to have a keylogger running the longer your browser session.

There is a _Download Site Data_ button at the bottom of the page. Clicking it lets you save your settings in a file you can reference if you're at a machine that doesn't have your SitePassword settings. This data doesn't contain anything that would seriously compromise your security if it got exposed, but you shouldn't publish it widely.

[Using the SitePassword Web Page](#webpage)
-------------------------------------------

There are times when you can't use the SitePassword extension, such as on a smart device that doesn't support browser extensions, when you're on a friend's machine, or you're using a different browser. In those cases you can open [SitePassord.info](sitepassword.info) and fill in the form manually. If you would like to skip this step in the future on this machine, click the _Remember_ button.

[SitePassword.info](sitepassword.info) can use bookmarks created by the extension to automate filling in the form. If you are logging into a web site, paste the URL of the login page into the domain name field. Your site name and user name fields will be filled in if you had previously remembered this domain name. If those fields aren't populated, find the appropriate bookmark in the _SitePasswordData_ bookmark folder, and paste it into the top field on the form. You will see the site name and user name fields get filled in.

If the domain name of the URL you pasted does not match that of the bookmark you selected, you'll get a big scary warning. It's telling you that you may be at a site spoofing the one you think you are at. Unfortunately, you will also see this warning when you are not being tricked. Many websites have several different login pages with different domain names. So, when you see the warning, check the URL of the page to make sure it's a login page for the site you think it is.

You can calculate your password without providing a domain name, say to get the password for an app on your smart phone. Of course, you won't be able to remember the settings until you provide a domain name. You can just make one up, _e.g., MyApp_, which you'll use the next time you need a password for that app.

There is a _Download Local Data_ button at the bottom of the page. Clicking it lets you save your settings in a file you can reference if you're at a machine that doesn't have your SitePassword settings. **Only settings for sites you've chosen to remember on this machine will be included.**

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