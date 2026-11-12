-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: mverse-iota.chjndnwgybfy.ap-south-1.rds.amazonaws.com    Database: chat_backend_db
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `chat_master`
--

DROP TABLE IF EXISTS `chat_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_master` (
  `chat_id` int NOT NULL AUTO_INCREMENT,
  `chat_type` enum('DIRECT','GROUP') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DIRECT',
  `chat_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direct_chat_key` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Format: minUserId_maxUserId for 1:1 deduplication',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `modified_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`chat_id`),
  UNIQUE KEY `idx_chat_master_direct_key` (`direct_chat_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chat_members`
--

DROP TABLE IF EXISTS `chat_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_members` (
  `chat_member_id` int NOT NULL AUTO_INCREMENT,
  `chat_id` int NOT NULL,
  `user_id` int NOT NULL,
  `member_role` enum('ADMIN','MEMBER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEMBER',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `modified_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`chat_member_id`),
  UNIQUE KEY `idx_chat_members_unique_pair` (`chat_id`,`user_id`),
  KEY `idx_chat_members_user_id` (`user_id`),
  CONSTRAINT `fk_chat_members_chat_id` FOREIGN KEY (`chat_id`) REFERENCES `chat_master` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_chat_members_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_master` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notification_master`
--

DROP TABLE IF EXISTS `notification_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_master` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT 'Recipient user ID',
  `sender_id` int DEFAULT NULL COMMENT 'Triggering sender user ID',
  `chat_id` int DEFAULT NULL COMMENT 'Related chat room ID',
  `firebase_message_id` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Firestore document ID for deep-linking',
  `notification_type` enum('NEW_MESSAGE','GROUP_ADDED','MENTION','SYSTEM') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW_MESSAGE',
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `modified_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_user_unread` (`user_id`,`is_read`),
  KEY `fk_notifications_sender_id` (`sender_id`),
  KEY `fk_notifications_chat_id` (`chat_id`),
  CONSTRAINT `fk_notifications_chat_id` FOREIGN KEY (`chat_id`) REFERENCES `chat_master` (`chat_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_sender_id` FOREIGN KEY (`sender_id`) REFERENCES `user_master` (`user_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_notifications_user_id` FOREIGN KEY (`user_id`) REFERENCES `user_master` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_master`
--

DROP TABLE IF EXISTS `user_master`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_master` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `emp_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `otp` int DEFAULT NULL,
  `otp_time` datetime DEFAULT NULL,
  `password_expiry_date` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `modified_at` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  `deleted_by` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `uq_user_master_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `vw_active_users`
--

DROP TABLE IF EXISTS `vw_active_users`;
/*!50001 DROP VIEW IF EXISTS `vw_active_users`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_active_users` AS SELECT 
 1 AS `user_id`,
 1 AS `user_name`,
 1 AS `email`,
 1 AS `role_id`,
 1 AS `emp_number`,
 1 AS `is_active`,
 1 AS `created_at`,
 1 AS `modified_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_chat_master`
--

DROP TABLE IF EXISTS `vw_chat_master`;
/*!50001 DROP VIEW IF EXISTS `vw_chat_master`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_chat_master` AS SELECT 
 1 AS `chat_id`,
 1 AS `chat_type`,
 1 AS `chat_name`,
 1 AS `direct_chat_key`,
 1 AS `is_active`,
 1 AS `created_by`,
 1 AS `created_at`,
 1 AS `modified_by`,
 1 AS `modified_at`,
 1 AS `deleted_by`,
 1 AS `deleted_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_chat_participants`
--

DROP TABLE IF EXISTS `vw_chat_participants`;
/*!50001 DROP VIEW IF EXISTS `vw_chat_participants`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_chat_participants` AS SELECT 
 1 AS `chat_member_id`,
 1 AS `chat_id`,
 1 AS `chat_type`,
 1 AS `chat_name`,
 1 AS `direct_chat_key`,
 1 AS `user_id`,
 1 AS `user_name`,
 1 AS `email`,
 1 AS `emp_number`,
 1 AS `member_role`,
 1 AS `joined_at`,
 1 AS `member_is_active`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_user_chats_summary`
--

DROP TABLE IF EXISTS `vw_user_chats_summary`;
/*!50001 DROP VIEW IF EXISTS `vw_user_chats_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_user_chats_summary` AS SELECT 
 1 AS `user_id`,
 1 AS `chat_id`,
 1 AS `chat_type`,
 1 AS `chat_name`,
 1 AS `direct_chat_key`,
 1 AS `my_role`,
 1 AS `joined_at`,
 1 AS `chat_created_at`,
 1 AS `chat_updated_at`,
 1 AS `total_members`,
 1 AS `member_ids_csv`,
 1 AS `member_ids_json`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `vw_user_notifications`
--

DROP TABLE IF EXISTS `vw_user_notifications`;
/*!50001 DROP VIEW IF EXISTS `vw_user_notifications`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_user_notifications` AS SELECT 
 1 AS `notification_id`,
 1 AS `recipient_id`,
 1 AS `sender_id`,
 1 AS `sender_name`,
 1 AS `sender_email`,
 1 AS `chat_id`,
 1 AS `chat_type`,
 1 AS `chat_name`,
 1 AS `firebase_message_id`,
 1 AS `notification_type`,
 1 AS `title`,
 1 AS `body`,
 1 AS `is_read`,
 1 AS `read_at`,
 1 AS `created_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'chat_backend_db'
--

--
-- Dumping routines for database 'chat_backend_db'
--

--
-- Final view structure for view `vw_active_users`
--

/*!50001 DROP VIEW IF EXISTS `vw_active_users`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`MverseAdmin`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_active_users` AS select `user_master`.`user_id` AS `user_id`,`user_master`.`user_name` AS `user_name`,`user_master`.`email` AS `email`,`user_master`.`role_id` AS `role_id`,`user_master`.`emp_number` AS `emp_number`,`user_master`.`is_active` AS `is_active`,`user_master`.`created_at` AS `created_at`,`user_master`.`modified_at` AS `modified_at` from `user_master` where ((`user_master`.`deleted_at` is null) and (`user_master`.`is_active` = 1)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_chat_master`
--

/*!50001 DROP VIEW IF EXISTS `vw_chat_master`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`MverseAdmin`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_chat_master` AS select `chat_master`.`chat_id` AS `chat_id`,`chat_master`.`chat_type` AS `chat_type`,`chat_master`.`chat_name` AS `chat_name`,`chat_master`.`direct_chat_key` AS `direct_chat_key`,`chat_master`.`is_active` AS `is_active`,`chat_master`.`created_by` AS `created_by`,`chat_master`.`created_at` AS `created_at`,`chat_master`.`modified_by` AS `modified_by`,`chat_master`.`modified_at` AS `modified_at`,`chat_master`.`deleted_by` AS `deleted_by`,`chat_master`.`deleted_at` AS `deleted_at` from `chat_master` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_chat_participants`
--

/*!50001 DROP VIEW IF EXISTS `vw_chat_participants`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`MverseAdmin`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_chat_participants` AS select `cm`.`chat_member_id` AS `chat_member_id`,`c`.`chat_id` AS `chat_id`,`c`.`chat_type` AS `chat_type`,`c`.`chat_name` AS `chat_name`,`c`.`direct_chat_key` AS `direct_chat_key`,`u`.`user_id` AS `user_id`,`u`.`user_name` AS `user_name`,`u`.`email` AS `email`,`u`.`emp_number` AS `emp_number`,`cm`.`member_role` AS `member_role`,`cm`.`joined_at` AS `joined_at`,`cm`.`is_active` AS `member_is_active` from ((`chat_members` `cm` join `chat_master` `c` on((`cm`.`chat_id` = `c`.`chat_id`))) join `user_master` `u` on((`cm`.`user_id` = `u`.`user_id`))) where ((`cm`.`deleted_at` is null) and (`cm`.`is_active` = 1) and (`c`.`deleted_at` is null) and (`c`.`is_active` = 1) and (`u`.`deleted_at` is null)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_user_chats_summary`
--

/*!50001 DROP VIEW IF EXISTS `vw_user_chats_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`MverseAdmin`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_user_chats_summary` AS select `my_cm`.`user_id` AS `user_id`,`c`.`chat_id` AS `chat_id`,`c`.`chat_type` AS `chat_type`,`c`.`chat_name` AS `chat_name`,`c`.`direct_chat_key` AS `direct_chat_key`,`my_cm`.`member_role` AS `my_role`,`my_cm`.`joined_at` AS `joined_at`,`c`.`created_at` AS `chat_created_at`,`c`.`modified_at` AS `chat_updated_at`,count(`all_cm`.`user_id`) AS `total_members`,group_concat(`all_cm`.`user_id` order by `all_cm`.`user_id` ASC separator ',') AS `member_ids_csv`,json_arrayagg(`all_cm`.`user_id`) AS `member_ids_json` from ((`chat_members` `my_cm` join `chat_master` `c` on((`my_cm`.`chat_id` = `c`.`chat_id`))) join `chat_members` `all_cm` on(((`c`.`chat_id` = `all_cm`.`chat_id`) and (`all_cm`.`deleted_at` is null) and (`all_cm`.`is_active` = 1)))) where ((`my_cm`.`deleted_at` is null) and (`my_cm`.`is_active` = 1) and (`c`.`deleted_at` is null) and (`c`.`is_active` = 1)) group by `my_cm`.`user_id`,`c`.`chat_id`,`c`.`chat_type`,`c`.`chat_name`,`c`.`direct_chat_key`,`my_cm`.`member_role`,`my_cm`.`joined_at`,`c`.`created_at`,`c`.`modified_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `vw_user_notifications`
--

/*!50001 DROP VIEW IF EXISTS `vw_user_notifications`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`MverseAdmin`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_user_notifications` AS select `n`.`notification_id` AS `notification_id`,`n`.`user_id` AS `recipient_id`,`n`.`sender_id` AS `sender_id`,`sender`.`user_name` AS `sender_name`,`sender`.`email` AS `sender_email`,`n`.`chat_id` AS `chat_id`,`c`.`chat_type` AS `chat_type`,`c`.`chat_name` AS `chat_name`,`n`.`firebase_message_id` AS `firebase_message_id`,`n`.`notification_type` AS `notification_type`,`n`.`title` AS `title`,`n`.`body` AS `body`,`n`.`is_read` AS `is_read`,`n`.`read_at` AS `read_at`,`n`.`created_at` AS `created_at` from ((`notification_master` `n` left join `user_master` `sender` on((`n`.`sender_id` = `sender`.`user_id`))) left join `chat_master` `c` on((`n`.`chat_id` = `c`.`chat_id`))) where ((`n`.`deleted_at` is null) and (`n`.`is_active` = 1)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-12 17:50:32
