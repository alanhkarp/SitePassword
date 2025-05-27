### What is SitePassword?

SitePassword is a password manager that calculates your passwords from a super password and a per account nickname and username. It also allows you to specify a password when you don't want to use the computed one.

### Overview

It's too hard for you to remember a strong password for every account you use. Password managers take care of this problem for you. Most of them store your passwords in encrypted form, either on your machine or in the cloud.

SitePassword is different. Instead of storing your passwords, it calculates them from a single super password and your nickname and user name for the account. That means you can usually get your password if you remember those three things. (Some web pages require additional settings.) SitePassword automatically saves your settings, so you don't have to remember them.

The <img src="images/instructionsopen.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon opens these instructions, and the <img src="images/instructionsclose.bmp" style="width: 16px; height: 16px; vertical-align: middle;"> icon closes them.

### Using the Extension

After you install the Chrome extension and visit a page with a login form, you'll see that the password field tells you to _Click SitePassword_. When you click on the SitePassword icon <img src="images/icon128.png" style="width: 16px; height: 16px; vertical-align: middle;">, you'll see a form with the domain name field filled in. Enter your super password, an easy to remember nickname for the account, and your user name for the account. You will see your username being filled into the login form and your site password being calculated as you type.

Mouse over to the login form's password field, which now should tell you to _Click here for password_. Click, and your password gets filled in. When you return to the same web page on any machine that you synchronize bookmarks with and that has the extenstion installed, you'll see your user name filled in and instructions to _Click here for password_. Click, and your password gets filled in.

### The Domain Name

The domain name is associated with the settings for this account. It is also the name of a bookmark in the SitePasswordData bookmark folder. That's the bookmark you can use to get your settings when you're on a machine that doesn't have the SitePassword extension installed.

You may have more than one domain name for a given account because some web sites use more than one domain name for logging into that account. You'll get the same password for all of the domain names because they are all associated with the same nickname.

### Your Super Password

You should choose a strong super password, one with upper and lower case letters, numbers, and special characters. You can also use a passphrase that's either randomly generated or that's meaningful to you. The stronger the better.

The reason is simple. A bad guy who knows one site password and can guess your nickname and user name for that account can start guessing super passwords. You want to make that job has hard as you can.

You can protect yourself further by using different super passwords for different kinds of accounts. You could have one that you use for banking, another for subscriptions, and a third for sites you find sketchy.

SitePassword doesn't prevent you from using a weak super password, but it does warn you. There is a strength indicator directly above the super password field. It uses a meter and color to let you know how strong your super password is. The tooltip tells you how long it would take a determined adversary to guess your super password.

You'll notice that your super password is not usually marked Strong until it is longer than an account password marked Strong. That's because the super password is something you can remember, while the account password is effectively a random string of characters, which is less guessable.

You will have to enter your super password each time you start your browser. That's because SitePassword never stores your super password; it only remembers it for the duration of your browser session.

SitePassword cannot retrieve your super password. You should make sure it's something you won't easily forget. You might even want to write it down and keep the copy in a secure place.

### Your Account Nickname

You refer to an account by assigning it a nickname that should be easy to remember, such as 'amazon' for amazon.com, but it doesn't have to be that simple. For example, you might want to append the year if you must change your password annually.

Your settings are associated with the account nickname. If you change one of the settings, that change will apply for all domain names associated with that account. If you change a nickname, all domain names associatd with the old nickname will be associated with the new one.

You [change an account password](#changing-a-site-password) by changing the nickname. All your settings will then be associated with the new nickname.

### Your User Name

Your user name is the name you use to log in to the account. It is associated with the nickname for the account and is used to calculate your account password. That means you can only have a single user name for a given nickname. If you want to use different user names for the same site, follow the instructions for [Shared Machines](#shared-machines).

Some sites make you fill in your user name manually before they show you the password field. In those cases, SitePassword can usually fill in the field if you dbl-click on it. If that doesn't work, you can copy your user name to the clipboard or type it in manually.

SitePassword will attempt to fill in the userid field of a login form. If you don't see it, one of a few things happened.

1.  You never provided your settings for this domain name.

    * This is the first time you've used SitePassword for this account.
    * This is a different domain name for logging into the same account.
    * You are at a fake site that is trying to steal your password.

3.  SitePassword incorrectly guessed the location of the userid field.
4.  SitePassword couldn't find the userid field.

In the last two cases, you'll have to fill in your userid manually, which you can do by copying it to the clipboard using the <img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon in the userid field.

### Your Account Password

SitePassword uses your super password, nickname for the site, and your user name for the site along with the additional settings to calculate your password for the account. Most of the time you only need to click on the password field of the login form to get your password.

Sometimes there is more than one field of type password on the page, say for the answer to a security question. In that case, you can dbl-click on the password field you want to fill in or paste your password from the clipboard.

When the generated password can't be used, say if you've been given one that you're not allowed to change, SitePassword can remember one you provide, as explained in [Providing a Password](#providing-a-password).

Short account passwords and those you create yourself might be weak. SitePassword uses a strength meter that appears above your accout password to tell you how strong it is. The meter's tooltip tells you how long it would take a determined adversary to guess it.

You can also get your passwords without the extension. Go to [https://sitepassword.info](https://sitepassword.info) and fill in the form.

### Providing a Password

Unlike most password managers that calculate your password, SitePassword gives you the option to provide your own. This is useful if you have a password that you can't change, such as one provided by your employer. You can also use this option if SitePassword can't compute a password acceptable by the site.

The password you provide is encrypted with the computed account password as a key. That means you must fill in the form before entering your password. After you fill in the form, open the settings and check the _Provide your own account password_ check box. You'll then be able to enter your password into the account password field.

### Input Field Menus

Each of the input fields has a menu that shows up when you mouse over (or tap on a touchscreen) the 3 dots (<img src="images/3bluedots.png" style="width: 16px; height: 16px; vertical-align: middle;">) in the right side of the field. Each field has a particular set of menu items. If an icon is grayed out, that function is not available for that field. For example, you can't show your super password if the field is empty.

<img src="images/help.png" style="width: 16px; height: 16px; vertical-align: middle;">   Every field has a help option, which provides a brief summary of the information provided in these Instructions.

<img src="images/forget.png" style="width: 16px; height: 16px; vertical-align: middle;">   The domain name, nickname, and user name fields have a Forget option. For example, if you click this icon in the account nickname field, you will be given the opportunity to permanently forget the settings for all domain names associated with that account nickname.

<img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;">   The user name and account password fields have a Copy option, which copies the contents of the field to the clipboard.

<img src="images/account.png" style="width: 16px; height: 16px; vertical-align: middle;">   Although you can change your account password by editing the nickname, the account nickname and account password fields have a Change Password option.

<img src="images/show.png" style="width: 16px; height: 16px; vertical-align: middle;">   <img src="images/hide.png" style="width: 16px; height: 16px; vertical-align: middle;">   The super and account password fields give you the option of showing or hiding the contents of the field.

### Additional Settings

The settings panel is divided into three sections. The first section is about your super and account passwords. The second section controls how SitePassword computes your account password. The third section lets you download your settings and export your passwords. Click on the <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon to open the settings panel and the <img src="images/gear2.png" style="width: 16px; height: 16px; vertical-align: middle;"> icon to close it.

The top section of the settings panel has three settings related to your super and account passwords. SitePassword allows you to provide your own password as explained in [Providing a Password](#providing-a-password),

You usually leave your super password filled in for the entire browser session, but you might not want to do that on a shared machine. Checking the _Clear super password on use_ means don't have to remember to clear it.

Your account password is not hidden by default. Surprisingly, people develop the ability to recognize their account passwords, allowing them detect typos when re-entering their super passwords. Check the _Hide account password by default_ button to hide it.

How SitePassword uses these settings to compute your account password is explained in [Computing an Acceptable Password](#computing-an-acceptable-password).

The _Download site data_ button is explained in [Downloading Your Settings](#downloading-your-settings), and the _Export passwords_ button, in [Exporting Your Passwords](#exporting-your-passwords).

### Computing an acceptable password

Some web sites have strict password rules, how long it must be, if it must contain upper case or lower case letters, numbers, or special characters, including restrictions on which special characters are allowed.

SitePassword can calculate a password that is acceptable to most sites with the default settings. You can change these settings if you run into a site that doesn't accept the calculated password. Click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;"> and change the appropriate menu entries. SitePassword was tested on hundreds of web sites to make sure it can almost always compute a valid password.

Although these settings produce valid passwords for most sites, you might feel more comfortable generating stronger account passwords by making them longer or by including special characters. Click _Save as default_ to make these settings the default for all new accounts.

### Changing an Account Password

Some sites make you change your password periodically. SitePassword makes that easy. Just change your nickname for the account. For example, if your current nickname is _MyBank1_, and they make you change your password, you could change the nickname to _MyBank2_. Your new account password will be completely different from the old one.

If you forget this trick for changing your account password, you can open the menu for the nickname or account password field and click the account icon <img src="images/account.png" style="width: 16px; height: 16px; vertical-align: middle;">. You will see a change password form.

### Using the Clipboard

There are two times when you won't be able to fill in your password in the login form by clicking on it. The first is when SitePassword can't find the password field. The second is when there is more than one password field on the page. In most cases, you can dbl-click. If that doesn't work, you can copy your password to the clipboard. Click on the SitePassword icon <img src="images/icon128.png" style="width: 16px; height: 16px; vertical-align: middle;"> and copy your account password to the clipboard by clicking on <img src="images/clipboard.png" style="width: 16px; height: 16px; vertical-align: middle;">.

Leaving your site password on the clipboard for any length of time can be dangerous. SitePassword will alert you to this danger by changing its icon to <img src="images/icon128pw.png" style="width: 16px; height: 16px; vertical-align: middle;"> when you use the clipboard icon. You can always clear the clipbord and reset the warning by using the SitePassword _Clear Clipboard_ button or by copying something else to the clipboard. (These steps only clear the top item if the clipboard provides a stack of items.)

### Phishing Warning

SitePassword includes an antiphishing feature. If you try to use the same nickname for another domain name, you will get a big, scary warning. It's telling you that you may be at a site spoofing the one you think you are at.

Unfortunately, you will also see this warning when you are not being tricked. Many websites have several different login pages for the same account. So, when you see the warning, check the domain name in the warning message to make sure it's a login page for the account you think it is.

If a site uses more than two domain names for logging into your account, you will see a less scary warning after the first one. It's telling you that the new domain name has the same suffix as domain names you said belong to this account.

You still need to be careful. Some domains provide subdomains for different services. For example, a college might host sites for students. You wouldn't want evilstudent.mycollege.edu to have your password for mycollege.edu.

### Synchronizing across Your Machines

If you go to the same login page on a different machine that you synchronize bookmarks with, you'll see your user name for the account filled in for you. That's because the extension stores your settings in a bookmark folder called _SitePasswordData_. The extension uses the bookmark named CommonSettings for its own use. The bookmarks with domain names for titles can be used at [https://sitepassword.info](https://sitepassword.info) .

**You must turn on synchronization in your browser to use this feature.**

### Shared Machines

Many households have one machine shared by everybody. It's likely that everyone uses the same user name and password for certain accounts, such as streaming services. It's also likely that those people use their individual user names and passwords for other accounts, such as social media.

SitePassword accomodates those uses with a feature provided by your browser called _profiles_. Simply create one profile for the shared account and one for each individual.

### Downloading Your Settings

There is a _Download Site Data_ button at the bottom of the popup window after you click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;">. Clicking this button lets you save your settings in a file you can reference if you need to look them up. All settings created on machines you synchronize bookmarks with are included.

### Exporting Your Passwords

There may come a time when you want to use a different password manager. In that case you can use the _Export passwords_ button at the bottom of the popup window after you click <img src="images/gear.png" style="width: 16px; height: 16px; vertical-align: middle;">. Clicking this button creates a file with your passwords. You can see a readable form of the data in the file by opening it in a spreadsheet.

You'll have to export to a separate file for each super password you use. Since SitePassword doesn't track your super passwords, it doesn't know which one goes with which domain. As a result each file will have a account password for every domain name in your SitePasswordData bookmarks folder. Only the domains associated with that super password will have the correct account password.

**Be very careful with this file.** Completely delete it from your machine, including emptying the trash, after you use it. If you don't, anyone who gets access to your machine can get your passwords.

### The Extension and the Web Page

There will be times when you are on a device that doesn't have SitePassword installed, such as at a friend's house or on your mobile device. You can still get your passwords by going to [https://sitepassword.info](https://sitepassword.info) or [the page on Github](https://alanhkarp.github.io/SitePasswordWeb/).

If you have synched your bookmarks to the device you are using, you can get your settings for the site by clicking on the appropriate bookmark to open the SitePassword web page, or you can paste the appropriate bookmark into the form if the page is already open.

See the instructions on the [https://sitepassword.info](https://sitepassword.info) web page for more information.

### Browser Autofill

The autofill feature of your browser can interfere with SitePassword. You should turn it off following the instructions for your browser.

### Source Code

If you are worried that SitePassword might go away, you can download the source code for the extension from the [SitePassword](https://github.com/alanhkarp/SitePassword) project and that of the web page version from the [SitePasswordWeb](https://github.com/alanhkarp/SitePasswordWeb) project. (For historical reasons, these are separate projects with a lot of duplicated code.)

### Developers

The SitePassword extension can be installed for Firefox most Chromium browsers using the code here. (Testing is sparse on Firefox.) Simply rename the manifestFirefox.json file to manifest.json, and install the extension using the mechanism provided by your browser.

You may find a need to debug the extension. The service worker, bg.js, and the content script, findpw.js, work normally, but on the Chrome browser the popup, ssp.js, won't stop at breakpoints hit early in its startup. Setting the constant _debugMode = true_ in ssp.js to true will make the popup stop at a _debugger_ statement early in the load process. This setting also stops the popup from closing automatically when you mouse out of it. This mode also uses a different bookmarks file, allowing you to debug without risking your real bookmarks.

A number of tests are included with the distribution. In keeping with the philosophy of avoiding dependencies, the tests don't use any frameworks. To run the tests, edit bg.js and set the constant _testMode = true_. Then reload the extension. A page will open in a new window. Right click on the SitePassword icon and inspect the popup. Test results appear on the console.

You can set _demoMode = true_ to use a separate set of bookmarks for demos.

### Voluntary Payment

If you like SitePassword, please make a contribution to the [Nancy Lee Hurtt '70 Maryland Promise Scholarship](https://giving.umd.edu/giving/fund.php?name=nancy-lee-hurtt-70-maryland-promise-scholarship) or your favorite charity.

### Credits

* Alan Karp is the princple culprit. He stared with a very simple password calculator in 2002 that he turned into a Chrome extension in 2012. What you see today is the result of many improvements over the years, a lot of them suggested by the other contributors. Don't blame anyone else for bugs or usablity problems, but do credit them with the improvements they suggested. Please send any feedback to [alanhkarp@gmail.com](mailto:alanhkarp@gmail.com).
* Douglas Crockford provided useful suggestions for improvements, many of which were resisted but make SitePassword much better, both in terms of functionality and usability. Two features stand out: the ability to provide your own account password and the Forget menu option. The look and feel is much improved due to Doug's constant nitpicking of seeminly minor details. It's what takes a tool from "Meh" to "Yeah." That kind of feedback is almost impossible to get even if you offer to pay. Getting that kind of feedback for free is rare.
* Dale Schumacker wrote most of the code for [https://sitepassword.info](https://sitepassword.info) and made many useful suggestions. His code has been changed enough that he is not responsible for any issues, but he deserves kudos for its overall design. As an early user of SitePassword, Dale provide critical feedback.
* Michael Josefik provided the professional design for this web page. He showed remarkable patience as his ideas were resisted but then implemented when he was proven right.
* Important security improvements came from the people at the Stanford Security Lunch. They did not do anything approaching a security review and are not responsible for any vulnerabilities.